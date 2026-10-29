import {
  useCallback, useEffect, useMemo, useRef,
} from 'react';
import { getConfig } from '@edx/frontend-platform/config';
import { useIntl } from '@edx/frontend-platform/i18n';
import { logError } from '@edx/frontend-platform/logging';
import { v4 as uuidv4 } from 'uuid';
import { useShallow } from 'zustand/react/shallow';

import { useEnterpriseCustomer } from '../../../../app/data';
import { isSendableMessage } from '../chat/Composer';
import { previousPageTurnId } from '../chat/MessageList';
import messages from '../messages';
import type { ChatTransport } from '../services/ChatTransport';
import { selectTransport } from '../services/selectTransport';
import { usePersonalizedSearchStore } from '../state/personalizedSearchStore';
import { removeTurn } from '../stream/applyPart';
import { sendTurnWorkflow } from '../workflows';

/**
 * Controller for the Personalized Search tab: the only place React context and hooks are
 * resolved (KD-6). Presentational components receive plain props from it.
 */
export const usePersonalizedSearchController = ({ transport: injected }: { transport?: ChatTransport } = {}) => {
  const intl = useIntl();
  const { data: enterpriseCustomer } = useEnterpriseCustomer();
  const enterpriseCustomerUuid = enterpriseCustomer?.uuid as string | undefined;
  const transport = useMemo(
    () => injected ?? selectTransport(getConfig().PERSONALIZED_SEARCH_TRANSPORT),
    [injected],
  );
  const abortRef = useRef<AbortController | null>(null);

  const {
    stream, viewedTurnId, pageFocusRequest, draft, unavailable, announcement,
  } = usePersonalizedSearchStore(useShallow((state) => ({
    stream: state.stream,
    viewedTurnId: state.viewedTurnId,
    pageFocusRequest: state.pageFocusRequest,
    draft: state.draft,
    unavailable: state.unavailable,
    announcement: state.announcement,
  })));

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
    usePersonalizedSearchStore.getState().setViewedTurnId(turnId);
  }, []);

  const showLastRecommendations = useCallback((turnId: string) => {
    const store = usePersonalizedSearchStore.getState();
    store.setViewedTurnId(turnId);
    store.requestPageFocus();
  }, []);

  const setDraft = useCallback((value: string) => {
    usePersonalizedSearchStore.getState().setDraft(value);
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
    setDraft,
  };
};

export type PersonalizedSearchController = ReturnType<typeof usePersonalizedSearchController>;
