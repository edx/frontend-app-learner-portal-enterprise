import { hasValidLicenseOrSubscriptionRequestsEnabled } from '../utils';
import { useBrowseAndRequestConfiguration } from './useBrowseAndRequest';
import useSubscriptions from './useSubscriptions';

export default function useHasValidLicenseOrSubscriptionRequestsEnabled() {
  const { data: { subscriptionLicense } } = useSubscriptions();
  const { data: browseAndRequestConfiguration } = useBrowseAndRequestConfiguration();
  return hasValidLicenseOrSubscriptionRequestsEnabled({
    subscriptionLicense,
    browseAndRequestConfiguration,
  });
}
