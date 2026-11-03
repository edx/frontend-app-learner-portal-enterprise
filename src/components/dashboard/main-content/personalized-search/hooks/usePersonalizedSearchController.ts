import { useMemo } from 'react';
import { getConfig } from '@edx/frontend-platform/config';
import { useIntl } from '@edx/frontend-platform/i18n';
import { useShallow } from 'zustand/react/shallow';

import { useEnterpriseCustomer } from '../../../../app/data';
import messages from '../messages';
import { selectTransport } from '../services/selectTransport';
import { usePersonalizedSearchStore } from '../state/personalizedSearchStore';

/**
 * Controller for the Personalized Search tab: the only place React context and hooks are
 * resolved (KD-6). Presentational components receive plain props from it.
 */
export const usePersonalizedSearchController = () => {
  const intl = useIntl();
  const { data: enterpriseCustomer } = useEnterpriseCustomer();
  const transport = useMemo(() => selectTransport(getConfig().PERSONALIZED_SEARCH_TRANSPORT), []);

  const { stream, unavailable } = usePersonalizedSearchStore(useShallow((state) => ({
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
    enterpriseCustomerUuid: enterpriseCustomer?.uuid as string | undefined,
    transport,
    turns: stream.turns,
    unavailable,
    openingChips,
  };
};

export type PersonalizedSearchController = ReturnType<typeof usePersonalizedSearchController>;
