import {
  useCallback, useEffect, useMemo, useRef, useState,
} from 'react';
import { useIntl } from '@edx/frontend-platform/i18n';
import { breakpoints, useMediaQuery } from '@openedx/paragon';
import { v4 as uuidv4 } from 'uuid';
import { useStore } from 'zustand';
import { useShallow } from 'zustand/react/shallow';

import messages from '../ui/messages';
import {
  hasPage, isSendableMessage, latestPicksTurnId, previousPageTurnId,
} from '../core/selectors';
import { removeTurn } from '../core/stream/applyPart';
import type { BlockValidator } from '../core/stream/applyPart';
import type { AssistantTurn, ItemCard } from '../core/stream/types';
import { joinKeysOf } from '../core/analytics';
import type { PromptSource, TrackAction, TrackProperties } from '../core/analytics';
import type { ChatTransport } from '../core/transports/ChatTransport';
import { FixtureChatTransport } from '../core/transports/FixtureChatTransport';
import type { DebugOverrides } from '../core/transports/SseChatTransport';
import type { BenchmarkRow } from '../core/debug/benchmark';
import { reconcileDebugSettings } from '../core/debug/reconcileDebugSettings';
import type { FeedbackAction } from '../core/workflows';
import type { PersonalizedSearchDeps } from './deps';
import {
  itemFeedbackWorkflow, loadFeedbackWorkflow, loadHistoryPageWorkflow, openSessionWorkflow, sendTurnWorkflow,
} from '../core/workflows';
import type { DebugSettings, MobilePane, PersonalizedSearchStoreApi } from './personalizedSearchStore';

export type TurnRating = 1 | -1 | null;

/** The overrides a debug-mode turn sends; unset choices fall back to the server defaults. */
export const toDebugOverrides = (settings: DebugSettings): DebugOverrides | null => {
  const overrides: DebugOverrides = {};
  if (settings.intentModel) {
    overrides.intent_model = settings.intentModel;
    overrides.intent_effort = settings.intentEffort;
  }
  if (settings.composeModel) {
    overrides.compose_model = settings.composeModel;
    overrides.compose_effort = settings.composeEffort;
  }
  return Object.keys(overrides).length ? overrides : null;
};

export interface PersonalizedSearchControllerOptions {
  deps: PersonalizedSearchDeps;
  store: PersonalizedSearchStoreApi;
  /** The block registry's check, so the reducer keeps only blocks the page can render. */
  isRenderableBlock?: BlockValidator;
}

/**
 * Builds the controller hook for one mounted tab: the only place React context and hooks are
 * resolved (KD-6). Presentational components receive plain props from it. The host's
 * dependencies and the tab's store are closed over, so the controller never imports the host
 * app (KD-10) and its callbacks stay stable.
 */
export const createPersonalizedSearchController = ({
  deps, store: storeApi, isRenderableBlock,
}: PersonalizedSearchControllerOptions) => {
  const usePersonalizedSearchController = (
    { transport: injected }: { transport?: ChatTransport } = {},
  ) => {
    const intl = useIntl();
    const enterpriseCustomer = deps.useEnterpriseContext();
    const enterpriseCustomerUuid = enterpriseCustomer.uuid;
    const [sessionParam, setSessionParam] = deps.useSessionParam();
    const enterpriseSlug = enterpriseCustomer.slug;
    const links = useMemo(() => deps.createItemLinks(enterpriseSlug ?? ''), [enterpriseSlug]);
    const debugEnabled = deps.debug.useDebugRequested();
    const getDebugOverrides = useCallback(() => (
      debugEnabled ? toDebugOverrides(storeApi.getState().debugSettings) : null
    ), [debugEnabled]);
    const configuredTransport = useMemo(
      () => injected ?? deps.createTransport(getDebugOverrides),
      [injected, getDebugOverrides],
    );
    // Debug mode's AI switch: live enterprise-access turns, or the canned fixture turns.
    const liveTransport = useMemo(
      () => injected ?? deps.debug.createLiveTransport(getDebugOverrides),
      [injected, getDebugOverrides],
    );
    const fixtureTransport = useMemo(() => injected ?? new FixtureChatTransport(), [injected]);
    const abortRef = useRef<AbortController | null>(null);

    const {
      stream, viewedTurnId, draft, unavailable, announcement,
      mobilePane, seenPageTurnId, debugSettings, debugConfig, debugConfigError, mode, pastSessionCreated, history,
      feedback, savedOpen, excludedOpen, excludedTabShown, feedbackLoaded,
    } = useStore(storeApi, useShallow((state) => ({
      stream: state.stream,
      viewedTurnId: state.viewedTurnId,
      draft: state.draft,
      unavailable: state.unavailable,
      announcement: state.announcement,
      mobilePane: state.mobilePane,
      seenPageTurnId: state.seenPageTurnId,
      mode: state.mode,
      pastSessionCreated: state.pastSessionCreated,
      history: state.history,
      feedback: state.feedback,
      savedOpen: state.savedOpen,
      excludedOpen: state.excludedOpen,
      excludedTabShown: state.excludedTabShown,
      feedbackLoaded: state.feedbackLoaded,
      debugSettings: state.debugSettings,
      debugConfig: state.debugConfig,
      debugConfigError: state.debugConfigError,
    })));

    // Layout (KD-1, REQ-011): dual pane from 768 px; below that, one pane at a time.
    const isWide = useMediaQuery({ minWidth: breakpoints.medium.minWidth });
    const reducedMotion = useMediaQuery({ query: '(prefers-reduced-motion: reduce)' });
    const newestPicksTurnId = useMemo(() => latestPicksTurnId(stream.turns), [stream.turns]);
    const pageOnScreen = isWide || mobilePane === 'page';
    useEffect(() => {
      if (pageOnScreen && newestPicksTurnId !== seenPageTurnId) {
        storeApi.getState().setSeenPageTurnId(newestPicksTurnId);
      }
    }, [pageOnScreen, newestPicksTurnId, seenPageTurnId]);
    const hasNewPicks = !pageOnScreen && newestPicksTurnId !== null && newestPicksTurnId !== seenPageTurnId;

    let transport = configuredTransport;
    if (debugEnabled) {
      transport = debugSettings.live ? liveTransport : fixtureTransport;
    }
    const debugBaseUrl = debugEnabled ? deps.debug.getApiBaseUrl() : null;

    // Load the server's model menu once per page view in debug mode.
    useEffect(() => {
      if (!debugEnabled || !debugBaseUrl || !enterpriseCustomerUuid
          || storeApi.getState().debugConfig !== undefined) {
        return;
      }
      deps.debug.fetchDebugConfig(enterpriseCustomerUuid)
        .then((config) => {
          const store = storeApi.getState();
          store.setDebugConfig(config);
          // Saved choices the server no longer offers fall back to its defaults (see reconcileDebugSettings).
          const stale = config ? reconcileDebugSettings(store.debugSettings, config) : {};
          if (Object.keys(stale).length) { store.setDebugSettings(stale); }
        })
        .catch((e) => {
          deps.logError(e);
          storeApi.getState().setDebugConfig(null, intl.formatMessage(messages.debugMenuError));
        });
    }, [debugEnabled, debugBaseUrl, enterpriseCustomerUuid, intl]);

    const busy = stream.activeTurnId !== null;

    const openingChips = useMemo(() => [
      intl.formatMessage(messages.chipLeadership),
      intl.formatMessage(messages.chipAi),
      intl.formatMessage(messages.chipData),
      intl.formatMessage(messages.chipQuick),
    ], [intl]);

    // Abort an in-flight turn when the tab unmounts.
    useEffect(() => () => abortRef.current?.abort(), []);

    /**
     * Sends a usage event with the turn's join keys (or the latest turn's), the enterprise and the
     * viewport. Properties are raw facts; nothing is counted or derived here (KD-12).
     */
    const track = useCallback((action: TrackAction, properties: TrackProperties = {}, turn?: AssistantTurn) => {
      if (!enterpriseCustomerUuid) { return; }
      const { turns } = storeApi.getState().stream;
      const context = turn?.analytics ?? [...turns].reverse().find((t) => t.analytics)?.analytics;
      try {
        deps.trackEvent(action, {
          ...joinKeysOf(context),
          enterprise_customer_uuid: enterpriseCustomerUuid,
          viewport: isWide ? 'desktop' : 'mobile',
          ...properties,
        });
      } catch (e) {
        deps.logError(e);
      }
    }, [enterpriseCustomerUuid, isWide]);
    const trackedTabView = useRef(false);
    useEffect(() => {
      if (trackedTabView.current || !enterpriseCustomerUuid) { return; }
      trackedTabView.current = true;
      track('tab_viewed', { entry_point: deps.getEntryPoint() });
    }, [enterpriseCustomerUuid, track]);

    /** The raw facts that identify an item event: the card's key and where the server placed it. */
    const itemFacts = (item: ItemCard, fallbackSection: string | null = null): TrackProperties => ({
      item_key: item.item_id,
      item_type: item.item_type,
      item_section: item.section ?? fallbackSection,
      item_position: item.position ?? null,
    });

    const send = useCallback(async (rawMessage: string, source: PromptSource = 'typed', chipLabel?: string) => {
      const store = storeApi.getState();
      const message = rawMessage.trim();
      if (!enterpriseCustomerUuid || store.stream.activeTurnId || !isSendableMessage(message)) {
        return;
      }
      const controller = new AbortController();
      abortRef.current = controller;
      const localId = uuidv4();
      // Sending from a reopened session continues it (same session uuid), now live.
      const resumedFromHistory = store.mode === 'past';
      if (resumedFromHistory) { store.setMode('live'); }
      // Fixed chip copy only (starter and follow-up chips); suggested chips are model-written and typed
      // text is the learner's.
      const fixedChip = source === 'starter_chip' || source === 'followup_chip';
      track('prompt_submitted', { prompt_source: source, chip_label: fixedChip ? chipLabel ?? message : null });
      store.setDraft('');
      store.setViewedTurnId(null);
      store.setAnnouncement('');

      const result = await sendTurnWorkflow({
        transport,
        request: {
          enterpriseCustomerUuid,
          sessionUuid: store.stream.session.sessionUuid,
          message,
          ...(resumedFromHistory ? { resumedFromHistory } : {}),
          ...(deps.getContentLocale ? { locale: deps.getContentLocale() } : {}),
        },
        localId,
        signal: controller.signal,
        dispatch: store.setStream,
        isRenderableBlock,
      });

      if (abortRef.current === controller) { abortRef.current = null; }
      const after = storeApi.getState();
      if (result.outcome === 'done') {
        after.setAnnouncement(intl.formatMessage(messages.newReplyAnnouncement, { count: result.itemCount }));
        const finished = after.stream.turns.find((t) => t.localId === localId);
        if (finished && hasPage(finished)) { track('results_rendered', {}, finished); }
      } else if (result.outcome === 'stopped') {
        // The stopped turn's blocks were discarded, so show the page from before it.
        const { turns } = after.stream;
        after.setViewedTurnId(previousPageTurnId(turns, turns.findIndex((t) => t.localId === localId)));
      } else if (result.status === 403 || result.status === 404) {
        if (result.status === 403) {
          deps.logError(`Personalized Search turn forbidden for enterprise ${enterpriseCustomerUuid}`);
        }
        after.setUnavailable(true);
      } else if (result.status === 400) {
        after.setDraft(message);
      }
    }, [enterpriseCustomerUuid, intl, transport, track]);

    const stop = useCallback(() => {
      abortRef.current?.abort();
    }, []);

    /** Resends a failed turn's message on the same session, replacing the failed turn. */
    const retry = useCallback((turnId: string) => {
      const store = storeApi.getState();
      const failed = store.stream.turns.find((t) => t.localId === turnId);
      if (!failed?.userMessage || store.stream.activeTurnId) { return; }
      store.setStream((current) => removeTurn(current, turnId));
      send(failed.userMessage);
    }, [send]);

    const newChat = useCallback(() => {
      track('new_chat_started'); // with the join keys of the chat being left
      abortRef.current?.abort();
      storeApi.getState().reset();
      setSessionParam(null);
    }, [track, setSessionParam]);

    const viewPage = useCallback((turnId: string) => {
      const store = storeApi.getState();
      store.setViewedTurnId(turnId);
      store.setMobilePane('page');
    }, []);
    /** Leaves an earlier reply's results for the newest ones. */
    const showLatestResults = useCallback(() => storeApi.getState().setViewedTurnId(null), []);

    // Saved and dismissed items (REQ-009), loaded once, lazily: when the page first has picks to mark
    // or hide, or when the Saved view opens, so the opening state makes no network request.
    useEffect(() => {
      const store = storeApi.getState();
      if (!enterpriseCustomerUuid || store.feedbackLoaded || !(newestPicksTurnId || savedOpen)) { return; }
      store.setFeedbackLoaded(true);
      loadFeedbackWorkflow(deps.feedbackApi, enterpriseCustomerUuid).then((loaded) => {
        storeApi.getState().setFeedback((f) => ({ ...f, ...loaded }));
      }).catch((e) => deps.logError(e));
    }, [enterpriseCustomerUuid, newestPicksTurnId, savedOpen]);

    const runFeedback = useCallback(async (action: FeedbackAction) => {
      if (!enterpriseCustomerUuid) { return; }
      const { sessionUuid } = storeApi.getState().stream.session;
      await itemFeedbackWorkflow(action, {
        api: {
          add: (kind, item) => deps.feedbackApi.addFeedback(enterpriseCustomerUuid, kind, item, sessionUuid),
          remove: (kind, itemId) => deps.feedbackApi.removeFeedback(enterpriseCustomerUuid, kind, itemId),
        },
        update: (fn) => storeApi.getState().setFeedback(fn),
        getState: () => storeApi.getState().feedback,
      });
    }, [enterpriseCustomerUuid]);

    const savedIds = useMemo(() => new Set(feedback.saved.map((item) => item.item_id)), [feedback.saved]);
    const dismissedIds = useMemo(() => new Set(feedback.dismissedIds), [feedback.dismissedIds]);
    const toggleSave = useCallback((item: ItemCard) => {
      track('item_save_toggled', { ...itemFacts(item, 'saved_tab'), saved: !savedIds.has(item.item_id) });
      return runFeedback({ type: 'toggleSave', item });
    }, [runFeedback, savedIds, track]);
    const dismiss = useCallback((item: ItemCard) => {
      track('item_dismissed', { ...itemFacts(item), dismissed: true });
      return runFeedback({ type: 'dismiss', item });
    }, [runFeedback, track]);
    const undoDismiss = useCallback(() => {
      const { undo } = storeApi.getState().feedback;
      if (undo) { track('item_dismissed', { ...itemFacts(undo), dismissed: false }); }
      return runFeedback({ type: 'undoDismiss' });
    }, [runFeedback, track]);
    /** Include a dismissed item in results again, from the Excluded tab. */
    const restore = useCallback((item: ItemCard) => {
      track('item_dismissed', { ...itemFacts(item, 'excluded_tab'), dismissed: false });
      return runFeedback({ type: 'restore', item });
    }, [runFeedback, track]);
    // The Excluded tab appears once the learner has any excluded item and stays (disabled) when the last
    // is restored; a reload with none hides it. Leaving it empty returns to For you.
    useEffect(() => {
      if (feedback.dismissed.length > 0 && !excludedTabShown) { storeApi.getState().showExcludedTab(); }
      if (feedback.dismissed.length === 0 && excludedOpen) { storeApi.getState().setExcludedOpen(false); }
    }, [feedback.dismissed.length, excludedTabShown, excludedOpen]);
    const openItem = useCallback((item: ItemCard, fallbackSection: string | null = null) => {
      track('result_clicked', itemFacts(item, fallbackSection));
    }, [track]);
    const explain = useCallback((scope: 'tile' | 'set' | 'order', item?: ItemCard) => {
      track('explanation_opened', { scope, item_key: item?.item_id ?? null });
    }, [track]);
    const clearFeedbackNotice = useCallback(() => {
      storeApi.getState().setFeedback((f) => ({ ...f, undo: null, error: false }));
    }, []);
    // Thumbs on replies: optimistic, reverted on failure; hidden if the server has no rating endpoint (404).
    const [ratings, setRatings] = useState<Record<string, TurnRating>>({});
    const [ratingUnavailable, setRatingUnavailable] = useState(false);
    const rateTurn = useCallback(async (turn: AssistantTurn, rating: 1 | -1) => {
      const { sessionUuid } = storeApi.getState().stream.session;
      if (!enterpriseCustomerUuid || !sessionUuid || !turn.sequence) { return; }
      const previous = ratings[turn.localId] ?? null;
      const next = previous === rating ? null : rating;
      setRatings((current) => ({ ...current, [turn.localId]: next }));
      try {
        await deps.feedbackApi.rateTurn(enterpriseCustomerUuid, sessionUuid, turn.sequence, next);
      } catch (e) {
        // Revert only if nothing newer was chosen meanwhile, so a slow failure can't undo a later rating.
        setRatings((current) => (current[turn.localId] === next ? { ...current, [turn.localId]: previous } : current));
        if ((e as { response?: { status?: number } })?.response?.status === 404) {
          setRatingUnavailable(true);
        } else {
          deps.logError(e);
        }
      }
    }, [enterpriseCustomerUuid, ratings]);
    const openSaved = useCallback(() => {
      track('saved_tab_opened');
      storeApi.getState().setSavedOpen(true);
    }, [track]);
    const closeSaved = useCallback(() => {
      storeApi.getState().setSavedOpen(false);
      storeApi.getState().setExcludedOpen(false);
    }, []);
    const openExcluded = useCallback(() => {
      track('excluded_tab_opened');
      storeApi.getState().setExcludedOpen(true);
    }, [track]);

    const loadHistoryPage = useCallback(async (page: number) => {
      const store = storeApi.getState();
      if (!enterpriseCustomerUuid || store.history.loading) { return; }
      store.setHistory({ loading: true, error: false });
      try {
        const loaded = await loadHistoryPageWorkflow(
          deps.sessionsApi,
          enterpriseCustomerUuid,
          page,
          () => storeApi.getState().history.items,
        );
        storeApi.getState().setHistory({ ...loaded, loading: false });
      } catch (e) {
        deps.logError(e);
        storeApi.getState().setHistory({ loading: false, error: true });
      }
    }, [enterpriseCustomerUuid]);

    const openHistory = useCallback(() => {
      track('history_opened');
      storeApi.getState().setHistory({ open: true });
      loadHistoryPage(1);
    }, [loadHistoryPage, track]);

    const closeHistory = useCallback(() => {
      storeApi.getState().setHistory({ open: false });
    }, []);

    const loadMoreHistory = useCallback(() => {
      loadHistoryPage(storeApi.getState().history.page + 1);
    }, [loadHistoryPage]);

    /**
     * Reopen a past session: replay its stored parts, unanimated, under the "Past search" banner. A
     * response that arrives after the learner moved on (sent a message, started a new chat, or opened
     * another session) is dropped.
     */
    const openRequest = useRef(0);
    const openSession = useCallback(async (sessionUuid: string, { restoring = false } = {}) => {
      const store = storeApi.getState();
      if (!enterpriseCustomerUuid || store.stream.activeTurnId) { return; }
      openRequest.current += 1;
      const request = openRequest.current;
      const isStale = () => request !== openRequest.current || storeApi.getState().stream !== store.stream;
      try {
        const reopened = await openSessionWorkflow(
          deps.sessionsApi,
          enterpriseCustomerUuid,
          sessionUuid,
          isRenderableBlock,
        );
        if (isStale()) { return; }
        const after = storeApi.getState();
        after.reset();
        after.setStream(() => reopened.stream);
        after.setMode('past', reopened.created);
        setRatings(reopened.ratings);
        after.setHistory({ open: false });
      } catch (e) {
        deps.logError(e);
        if (isStale()) { return; }
        if (restoring) {
          setSessionParam(null); // the URL named a conversation that's gone or not this learner's
        } else {
          storeApi.getState().setHistory({ error: true });
        }
      }
    }, [enterpriseCustomerUuid, setSessionParam]);

    // The conversation id lives in the URL (?session=), so Back and Forward return to it. On arriving with
    // one, reopen it once; after that, keep the URL in step with the conversation shown.
    const restoredSession = useRef(false);
    useEffect(() => {
      if (restoredSession.current || !enterpriseCustomerUuid) { return; }
      restoredSession.current = true;
      if (sessionParam && storeApi.getState().stream.session.sessionUuid !== sessionParam) {
        openSession(sessionParam, { restoring: true });
      }
    }, [enterpriseCustomerUuid, sessionParam, openSession]);
    const shownSessionUuid = stream.session.sessionUuid;
    useEffect(() => {
      if (restoredSession.current && shownSessionUuid && shownSessionUuid !== sessionParam) {
        setSessionParam(shownSessionUuid);
      }
    }, [shownSessionUuid, sessionParam, setSessionParam]);

    const showPane = useCallback((pane: MobilePane) => {
      storeApi.getState().setMobilePane(pane);
    }, []);

    const setDraft = useCallback((value: string) => {
      storeApi.getState().setDraft(value);
    }, []);

    const setDebugSettings = useCallback((changes: Partial<DebugSettings>) => {
      const store = storeApi.getState();
      store.setDebugSettings(changes);
      // Switching backends retries availability: the other backend may answer.
      if (changes.live !== undefined) { store.setUnavailable(false); }
    }, []);

    const copyBenchmark = useCallback(async (rows: BenchmarkRow[]) => {
      const store = storeApi.getState();
      try {
        await navigator.clipboard.writeText(JSON.stringify(rows, null, 2));
        store.setAnnouncement(intl.formatMessage(messages.debugCopied, { count: rows.length }));
      } catch (e) {
        deps.logError(e);
        store.setAnnouncement(intl.formatMessage(messages.debugCopyFailed));
      }
    }, [intl]);

    return {
      track,
      openItem,
      explain,
      ratings,
      rateTurn: ratingUnavailable ? undefined : rateTurn,
      enterpriseCustomerUuid,
      enterpriseSlug,
      links,
      transport,
      turns: stream.turns,
      session: stream.session,
      busy,
      viewedTurnId,
      draft,
      unavailable,
      announcement,
      openingChips,
      send,
      stop,
      retry,
      newChat,
      viewPage,
      showLatestResults,
      isWide,
      reducedMotion,
      mobilePane,
      hasNewPicks,
      showPane,
      mode,
      pastSessionCreated,
      history,
      openHistory,
      closeHistory,
      loadMoreHistory,
      openSession,
      feedback,
      feedbackLoaded,
      savedIds,
      dismissedIds,
      savedOpen,
      excludedOpen,
      excludedTabShown,
      toggleSave,
      dismiss,
      undoDismiss,
      restore,
      openExcluded,
      clearFeedbackNotice,
      openSaved,
      closeSaved,
      setDraft,
      debugEnabled,
      debugBaseUrl,
      debugSettings,
      debugConfig,
      debugConfigError,
      setDebugSettings,
      copyBenchmark,
    };
  };
  return usePersonalizedSearchController;
};

export type PersonalizedSearchController = ReturnType<ReturnType<typeof createPersonalizedSearchController>>;
