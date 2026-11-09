import { useMemo } from 'react';
import { useIntl } from '@edx/frontend-platform/i18n';
import { useStore } from 'zustand';
import { useShallow } from 'zustand/react/shallow';

import messages from '../ui/messages';
import type { PersonalizedSearchDeps } from './deps';
import type { PersonalizedSearchStoreApi } from './personalizedSearchStore';

export interface PersonalizedSearchControllerOptions {
  deps: PersonalizedSearchDeps;
  store: PersonalizedSearchStoreApi;
}

/**
 * Builds the controller hook for one mounted tab: the only place React context and hooks are
 * resolved (KD-6). Presentational components receive plain props from it. The host's
 * dependencies and the tab's store are closed over, so the controller never imports the host
 * app (KD-10) and its callbacks stay stable.
 */
export const createPersonalizedSearchController = ({
  deps, store: storeApi,
}: PersonalizedSearchControllerOptions) => {
  const usePersonalizedSearchController = () => {
    const intl = useIntl();
    const enterpriseCustomer = deps.useEnterpriseContext();
    const transport = useMemo(() => deps.createTransport(), []);

    const { stream, unavailable } = useStore(storeApi, useShallow((state) => ({
      stream: state.stream,
      unavailable: state.unavailable,
    })));

    const openingChips = useMemo(() => [
      intl.formatMessage(messages.chipLeadership),
      intl.formatMessage(messages.chipAi),
      intl.formatMessage(messages.chipData),
      intl.formatMessage(messages.chipQuick),
    ], [intl]);

    return {
      enterpriseCustomerUuid: enterpriseCustomer.uuid,
      transport,
      turns: stream.turns,
      unavailable,
      openingChips,
    };
  };
  return usePersonalizedSearchController;
};

export type PersonalizedSearchController = ReturnType<ReturnType<typeof createPersonalizedSearchController>>;
