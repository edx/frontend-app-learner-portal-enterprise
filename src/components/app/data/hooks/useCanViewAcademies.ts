import { canViewAcademies } from '../utils';
import useEnterpriseLearner from './useEnterpriseLearner';
import { useBrowseAndRequestConfiguration } from './useBrowseAndRequest';
import useSubscriptions from './useSubscriptions';

interface SubscriptionsData {
  subscriptionLicense?: SubscriptionLicense | null;
}

/**
 * Determines whether Academies entry points should be surfaced to the current learner.
 *
 * Academies require the enterprise customer to have the Academies entitlement enabled, the
 * authenticated user to be linked to that customer, and the learner to have subscription-based
 * access (an activated and current license, or the ability to request one via browse & request).
 *
 * @returns Whether Academies entry points should be surfaced.
 */
export default function useCanViewAcademies(): boolean {
  const { data: enterpriseLearner } = useEnterpriseLearner();
  const { data: subscriptionsData } = useSubscriptions();
  const { data: browseAndRequestConfiguration } = useBrowseAndRequestConfiguration();

  const { subscriptionLicense }: Partial<SubscriptionsData> = subscriptionsData ?? {};

  return canViewAcademies({
    enterpriseCustomer: enterpriseLearner?.enterpriseCustomer,
    allLinkedEnterpriseCustomerUsers: enterpriseLearner?.allLinkedEnterpriseCustomerUsers,
    subscriptionLicense,
    browseAndRequestConfiguration,
  });
}
