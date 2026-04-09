import { useMemo } from 'react';

import useEnterpriseOffers from './useEnterpriseOffers';
import useRedeemablePolicies from './useRedeemablePolicies';
import useCatalogsForSubsidyRequests from './useCatalogsForSubsidyRequests';
import { getSearchCatalogs } from '../utils';
import useSubscriptions from './useSubscriptions';
import useCouponCodes from './useCouponCodes';


/**
 * Determines the enterprise catalog UUIDs to filter on, if any, based on the subsidies
 * available to the learner. Enterprise catalogs associated with expired subsidies are
 * excluded. Ensures no duplicate catalog UUIDs are returned.
 */
export default function useSearchCatalogs() {
  console.log('[useSearchCatalogs] HOOK CALLED');
  const { data: { subscriptionLicense, subscriptionLicenses, licenseSchemaVersion, licensesByCatalog = {} } } = useSubscriptions();
  const { data: { redeemablePolicies } } = useRedeemablePolicies();
  const { data: { couponCodeAssignments } } = useCouponCodes();
  const { data: { currentEnterpriseOffers } } = useEnterpriseOffers();
  const catalogsForSubsidyRequests = useCatalogsForSubsidyRequests();

  // Strict v2: use only the catalogs in licensesByCatalog
  const searchCatalogs = useMemo(() => {
    let result;
    if (licenseSchemaVersion === 'v2' && Object.keys(licensesByCatalog).length > 0) {
      result = Object.keys(licensesByCatalog);
    } else {
      // fallback to old logic for v1 or if no licensesByCatalog
      result = getSearchCatalogs({
        redeemablePolicies,
        catalogsForSubsidyRequests,
        couponCodeAssignments,
        currentEnterpriseOffers,
        subscriptionLicense,
        subscriptionLicenses,
      });
    }
    // Debug log for troubleshooting (always visible)
    // eslint-disable-next-line no-console
    console.log('[useSearchCatalogs] schema:', licenseSchemaVersion, 'licensesByCatalog:', licensesByCatalog, 'searchCatalogs:', result);
    return result;
  }, [
    licenseSchemaVersion,
    licensesByCatalog,
    redeemablePolicies,
    catalogsForSubsidyRequests,
    couponCodeAssignments,
    currentEnterpriseOffers,
    subscriptionLicense,
    subscriptionLicenses,
  ]);

  return searchCatalogs;
}
