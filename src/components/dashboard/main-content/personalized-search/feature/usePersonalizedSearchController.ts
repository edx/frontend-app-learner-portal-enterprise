import {
  useCallback, useEffect, useMemo, useRef,
} from 'react';
import { useIntl } from '@edx/frontend-platform/i18n';
import { breakpoints, useMediaQuery } from '@openedx/paragon';
import { v4 as uuidv4 } from 'uuid';
import { useStore } from 'zustand';
import { useShallow } from 'zustand/react/shallow';

import messages from '../ui/messages';
import { isSendableMessage, latestPicksTurnId, previousPageTurnId } from '../core/selectors';
import { removeTurn } from '../core/stream/applyPart';
import type { BlockValidator } from '../core/stream/applyPart';
import type { ChatTransport } from '../core/transports/ChatTransport';
import type { PersonalizedSearchDeps } from './deps';
import { sendTurnWorkflow } from '../core/workflows';
import type { MobilePane, PersonalizedSearchStoreApi } from './personalizedSearchStore';

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
    const enterpriseSlug = enterpriseCustomer.slug;
    const links = useMemo(() => deps.createItemLinks(enterpriseSlug ?? ''), [enterpriseSlug]);
    const transport = useMemo(
      () => injected ?? deps.createTransport(),
      [injected],
    );
    const abortRef = useRef<AbortController | null>(null);

    const {
      stream, viewedTurnId, pageFocusRequest, draft, unavailable, announcement,
      mobilePane, seenPageTurnId,
    } = useStore(storeApi, useShallow((state) => ({
      stream: state.stream,
      viewedTurnId: state.viewedTurnId,
      pageFocusRequest: state.pageFocusRequest,
      draft: state.draft,
      unavailable: state.unavailable,
      announcement: state.announcement,
      mobilePane: state.mobilePane,
      seenPageTurnId: state.seenPageTurnId,
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
      const store = storeApi.getState();
      const message = rawMessage.trim();
      if (!enterpriseCustomerUuid || store.stream.activeTurnId || !isSendableMessage(message)) {
        return;
      }
      const controller = new AbortController();
      abortRef.current = controller;
      const localId = uuidv4();
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
        isRenderableBlock,
      });

      if (abortRef.current === controller) { abortRef.current = null; }
      const after = storeApi.getState();
      if (result.outcome === 'done') {
        after.setAnnouncement(intl.formatMessage(messages.newReplyAnnouncement, { count: result.itemCount }));
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
    }, [enterpriseCustomerUuid, intl, transport]);

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
      abortRef.current?.abort();
      storeApi.getState().reset();
    }, []);

    const viewPage = useCallback((turnId: string) => {
      const store = storeApi.getState();
      store.setViewedTurnId(turnId);
      store.setMobilePane('page');
    }, []);

    const showPane = useCallback((pane: MobilePane) => {
      storeApi.getState().setMobilePane(pane);
    }, []);

    const showLastRecommendations = useCallback((turnId: string) => {
      const store = storeApi.getState();
      store.setViewedTurnId(turnId);
      store.setMobilePane('page');
      store.requestPageFocus();
    }, []);

    const setDraft = useCallback((value: string) => {
      storeApi.getState().setDraft(value);
    }, []);

    return {
      enterpriseCustomerUuid,
      enterpriseSlug,
      links,
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
      setDraft,
    };
  };
  return usePersonalizedSearchController;
};

export type PersonalizedSearchController = ReturnType<ReturnType<typeof createPersonalizedSearchController>>;
