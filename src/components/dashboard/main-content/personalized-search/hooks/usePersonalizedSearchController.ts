import {
  useCallback, useEffect, useMemo, useRef,
} from 'react';
import { getConfig } from '@edx/frontend-platform/config';
import { useIntl } from '@edx/frontend-platform/i18n';
import { breakpoints, useMediaQuery } from '@openedx/paragon';
import { logError } from '@edx/frontend-platform/logging';
import { useLocation } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { useShallow } from 'zustand/react/shallow';

import { useEnterpriseCustomer } from '../../../../app/data';
import { isSendableMessage } from '../chat/Composer';
import { previousPageTurnId } from '../chat/MessageList';
import messages from '../messages';
import { latestPicksTurnId } from '../page/LearningPagePane';
import type { ChatTransport } from '../services/ChatTransport';
import { fetchDebugConfig, getPersonalizedSearchApiBaseUrl } from '../services/debugConfig';
import { FixtureChatTransport } from '../services/FixtureChatTransport';
import { selectTransport } from '../services/selectTransport';
import { SseChatTransport } from '../services/SseChatTransport';
import { getSession, listSessions } from '../services/sessionsRepository';
import type { DebugOverrides } from '../services/SseChatTransport';
import { usePersonalizedSearchStore } from '../state/personalizedSearchStore';
import type { DebugSettings, MobilePane } from '../state/personalizedSearchStore';
import type { BenchmarkRow } from '../debug/benchmark';
import { removeTurn } from '../stream/applyPart';
import { reopenSessionWorkflow, sendTurnWorkflow } from '../workflows';

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

/**
 * Controller for the Personalized Search tab: the only place React context and hooks are
 * resolved (KD-6). Presentational components receive plain props from it.
 */
export const usePersonalizedSearchController = ({ transport: injected }: { transport?: ChatTransport } = {}) => {
  const intl = useIntl();
  const { data: enterpriseCustomer } = useEnterpriseCustomer();
  const enterpriseCustomerUuid = enterpriseCustomer?.uuid as string | undefined;
  const { search } = useLocation();
  const debugEnabled = new URLSearchParams(search).get('debug') === 'true';
  const getDebugOverrides = useCallback(() => (
    debugEnabled ? toDebugOverrides(usePersonalizedSearchStore.getState().debugSettings) : null
  ), [debugEnabled]);
  const configuredTransport = useMemo(
    () => injected ?? selectTransport(getConfig().PERSONALIZED_SEARCH_TRANSPORT, getDebugOverrides),
    [injected, getDebugOverrides],
  );
  // Debug mode's AI switch: live enterprise-access turns, or the canned fixture turns.
  const liveTransport = useMemo(
    () => injected ?? new SseChatTransport({ getBaseUrl: getPersonalizedSearchApiBaseUrl, getDebugOverrides }),
    [injected, getDebugOverrides],
  );
  const fixtureTransport = useMemo(() => injected ?? new FixtureChatTransport(), [injected]);
  const abortRef = useRef<AbortController | null>(null);

  const {
    stream, viewedTurnId, pageFocusRequest, draft, unavailable, announcement,
    mobilePane, seenPageTurnId, debugSettings, debugConfig, debugConfigError, mode, pastSessionCreated, history,
  } = usePersonalizedSearchStore(useShallow((state) => ({
    stream: state.stream,
    viewedTurnId: state.viewedTurnId,
    pageFocusRequest: state.pageFocusRequest,
    draft: state.draft,
    unavailable: state.unavailable,
    announcement: state.announcement,
    mobilePane: state.mobilePane,
    seenPageTurnId: state.seenPageTurnId,
    mode: state.mode,
    pastSessionCreated: state.pastSessionCreated,
    history: state.history,
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
      usePersonalizedSearchStore.getState().setSeenPageTurnId(newestPicksTurnId);
    }
  }, [pageOnScreen, newestPicksTurnId, seenPageTurnId]);
  const hasNewPicks = !pageOnScreen && newestPicksTurnId !== null && newestPicksTurnId !== seenPageTurnId;

  let transport = configuredTransport;
  if (debugEnabled) {
    transport = debugSettings.live ? liveTransport : fixtureTransport;
  }
  const debugBaseUrl = debugEnabled ? getPersonalizedSearchApiBaseUrl() : null;

  // Load the server's model menu once per page view in debug mode.
  useEffect(() => {
    if (!debugEnabled || !debugBaseUrl || !enterpriseCustomerUuid
        || usePersonalizedSearchStore.getState().debugConfig !== undefined) {
      return;
    }
    fetchDebugConfig(debugBaseUrl, enterpriseCustomerUuid)
      .then((config) => usePersonalizedSearchStore.getState().setDebugConfig(config))
      .catch((e) => {
        logError(e);
        usePersonalizedSearchStore.getState().setDebugConfig(null, 'Could not load the model menu.');
      });
  }, [debugEnabled, debugBaseUrl, enterpriseCustomerUuid]);

  const busy = stream.activeTurnId !== null;

  const openingChips = useMemo(() => [
    intl.formatMessage(messages.chipLeadership),
    intl.formatMessage(messages.chipAi),
    intl.formatMessage(messages.chipData),
    intl.formatMessage(messages.chipQuick),
  ], [intl]);

  // Abort an in-flight turn when the tab unmounts.
  useEffect(() => () => abortRef.current?.abort(), []);

  const send = useCallback(async (rawMessage: string) => {
    const store = usePersonalizedSearchStore.getState();
    const message = rawMessage.trim();
    if (!enterpriseCustomerUuid || store.stream.activeTurnId || !isSendableMessage(message)) {
      return;
    }
    const controller = new AbortController();
    abortRef.current = controller;
    const localId = uuidv4();
    // Sending from a reopened session continues it (same session uuid), now live.
    if (store.mode === 'past') { store.setMode('live'); }
    store.setDraft('');
    store.setViewedTurnId(null);
    store.setAnnouncement('');

    const result = await sendTurnWorkflow({
      transport,
      request: {
        enterpriseCustomerUuid,
        sessionUuid: store.stream.session.sessionUuid,
        message,
      },
      localId,
      signal: controller.signal,
      dispatch: store.setStream,
    });

    if (abortRef.current === controller) { abortRef.current = null; }
    const after = usePersonalizedSearchStore.getState();
    if (result.outcome === 'done') {
      after.setAnnouncement(intl.formatMessage(messages.newReplyAnnouncement, { count: result.itemCount }));
    } else if (result.outcome === 'stopped') {
      // The stopped turn's blocks were discarded, so show the page from before it.
      const { turns } = after.stream;
      after.setViewedTurnId(previousPageTurnId(turns, turns.findIndex((t) => t.localId === localId)));
    } else if (result.status === 403 || result.status === 404) {
      if (result.status === 403) {
        logError(`Personalized Search turn forbidden for enterprise ${enterpriseCustomerUuid}`);
      }
      after.setUnavailable(true);
    } else if (result.status === 400) {
      after.setDraft(message);
    }
  }, [enterpriseCustomerUuid, intl, transport]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  /** Resends a failed turn's message on the same session, replacing the failed turn. */
  const retry = useCallback((turnId: string) => {
    const store = usePersonalizedSearchStore.getState();
    const failed = store.stream.turns.find((t) => t.localId === turnId);
    if (!failed?.userMessage || store.stream.activeTurnId) { return; }
    store.setStream((current) => removeTurn(current, turnId));
    send(failed.userMessage);
  }, [send]);

  const newChat = useCallback(() => {
    abortRef.current?.abort();
    usePersonalizedSearchStore.getState().reset();
  }, []);

  const viewPage = useCallback((turnId: string) => {
    const store = usePersonalizedSearchStore.getState();
    store.setViewedTurnId(turnId);
    store.setMobilePane('page');
  }, []);

  const loadHistoryPage = useCallback(async (page: number) => {
    const store = usePersonalizedSearchStore.getState();
    if (!enterpriseCustomerUuid || store.history.loading) { return; }
    store.setHistory({ loading: true, error: false });
    try {
      const result = await listSessions(getPersonalizedSearchApiBaseUrl(), enterpriseCustomerUuid, page);
      const { history: current } = usePersonalizedSearchStore.getState();
      usePersonalizedSearchStore.getState().setHistory({
        items: page === 1 ? result.results : [...current.items, ...result.results],
        page,
        hasMore: !!result.next,
        loading: false,
      });
    } catch (e) {
      logError(e);
      usePersonalizedSearchStore.getState().setHistory({ loading: false, error: true });
    }
  }, [enterpriseCustomerUuid]);

  const openHistory = useCallback(() => {
    usePersonalizedSearchStore.getState().setHistory({ open: true });
    loadHistoryPage(1);
  }, [loadHistoryPage]);

  const closeHistory = useCallback(() => {
    usePersonalizedSearchStore.getState().setHistory({ open: false });
  }, []);

  const loadMoreHistory = useCallback(() => {
    loadHistoryPage(usePersonalizedSearchStore.getState().history.page + 1);
  }, [loadHistoryPage]);

  /** Reopen a past session: replay its stored parts, unanimated, under the "Past search" banner. */
  const openSession = useCallback(async (sessionUuid: string) => {
    const store = usePersonalizedSearchStore.getState();
    if (!enterpriseCustomerUuid || store.stream.activeTurnId) { return; }
    try {
      const detail = await getSession(getPersonalizedSearchApiBaseUrl(), enterpriseCustomerUuid, sessionUuid);
      const after = usePersonalizedSearchStore.getState();
      after.reset();
      after.setStream(() => reopenSessionWorkflow(detail));
      after.setMode('past', detail.created);
      after.setHistory({ open: false });
    } catch (e) {
      logError(e);
      usePersonalizedSearchStore.getState().setHistory({ error: true });
    }
  }, [enterpriseCustomerUuid]);

  const showPane = useCallback((pane: MobilePane) => {
    usePersonalizedSearchStore.getState().setMobilePane(pane);
  }, []);

  const showLastRecommendations = useCallback((turnId: string) => {
    const store = usePersonalizedSearchStore.getState();
    store.setViewedTurnId(turnId);
    store.setMobilePane('page');
    store.requestPageFocus();
  }, []);

  const setDraft = useCallback((value: string) => {
    usePersonalizedSearchStore.getState().setDraft(value);
  }, []);

  const setDebugSettings = useCallback((changes: Partial<DebugSettings>) => {
    const store = usePersonalizedSearchStore.getState();
    store.setDebugSettings(changes);
    // Switching backends retries availability: the other backend may answer.
    if (changes.live !== undefined) { store.setUnavailable(false); }
  }, []);

  const copyBenchmark = useCallback(async (rows: BenchmarkRow[]) => {
    const store = usePersonalizedSearchStore.getState();
    try {
      await navigator.clipboard.writeText(JSON.stringify(rows, null, 2));
      store.setAnnouncement(`Copied ${rows.length} benchmark rows.`);
    } catch (e) {
      logError(e);
      store.setAnnouncement('Could not copy the benchmark rows.');
    }
  }, []);

  return {
    enterpriseCustomerUuid,
    enterpriseSlug: enterpriseCustomer?.slug as string | undefined,
    transport,
    turns: stream.turns,
    session: stream.session,
    busy,
    viewedTurnId,
    pageFocusRequest,
    draft,
    unavailable,
    announcement,
    openingChips,
    send,
    stop,
    retry,
    newChat,
    viewPage,
    showLastRecommendations,
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

export type PersonalizedSearchController = ReturnType<typeof usePersonalizedSearchController>;
