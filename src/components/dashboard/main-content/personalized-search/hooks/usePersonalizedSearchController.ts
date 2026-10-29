import {
  useCallback, useEffect, useMemo, useRef,
} from 'react';
import { getConfig } from '@edx/frontend-platform/config';
import { useIntl } from '@edx/frontend-platform/i18n';
import { v4 as uuidv4 } from 'uuid';
import { useShallow } from 'zustand/react/shallow';

import { useEnterpriseCustomer } from '../../../../app/data';
import { isSendableMessage } from '../chat/Composer';
import messages from '../messages';
import type { ChatTransport } from '../services/ChatTransport';
import { selectTransport } from '../services/selectTransport';
import { usePersonalizedSearchStore } from '../state/personalizedSearchStore';
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
      localId: uuidv4(),
      signal: controller.signal,
      dispatch: store.setStream,
    });

    if (abortRef.current === controller) { abortRef.current = null; }
    if (result.outcome === 'done') {
      usePersonalizedSearchStore.getState().setAnnouncement(
        intl.formatMessage(messages.newReplyAnnouncement, { count: result.itemCount }),
      );
    }
  }, [enterpriseCustomerUuid, intl, transport]);

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
    newChat,
    viewPage,
    showLastRecommendations,
    setDraft,
  };
};

export type PersonalizedSearchController = ReturnType<typeof usePersonalizedSearchController>;
