import {
  useCallback, useEffect, useMemo, useRef,
} from 'react';
import { useIntl } from '@edx/frontend-platform/i18n';
import { v4 as uuidv4 } from 'uuid';
import { useStore } from 'zustand';
import { useShallow } from 'zustand/react/shallow';

import messages from '../ui/messages';
import { isSendableMessage } from '../core/selectors';
import type { BlockValidator } from '../core/stream/applyPart';
import type { ChatTransport } from '../core/transports/ChatTransport';
import type { PersonalizedSearchDeps } from './deps';
import { sendTurnWorkflow } from '../core/workflows';
import type { PersonalizedSearchStoreApi } from './personalizedSearchStore';

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
    } = useStore(storeApi, useShallow((state) => ({
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
      const store = storeApi.getState();
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
        isRenderableBlock,
      });

      if (abortRef.current === controller) { abortRef.current = null; }
      if (result.outcome === 'done') {
        storeApi.getState().setAnnouncement(
          intl.formatMessage(messages.newReplyAnnouncement, { count: result.itemCount }),
        );
      }
    }, [enterpriseCustomerUuid, intl, transport]);

    const newChat = useCallback(() => {
      abortRef.current?.abort();
      storeApi.getState().reset();
    }, []);

    const viewPage = useCallback((turnId: string) => {
      storeApi.getState().setViewedTurnId(turnId);
    }, []);

    const showLastRecommendations = useCallback((turnId: string) => {
      const store = storeApi.getState();
      store.setViewedTurnId(turnId);
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
      newChat,
      viewPage,
      showLastRecommendations,
      setDraft,
    };
  };
  return usePersonalizedSearchController;
};

export type PersonalizedSearchController = ReturnType<ReturnType<typeof createPersonalizedSearchController>>;
