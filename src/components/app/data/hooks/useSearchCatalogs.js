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
  const { data: { subscriptionLicense, subscriptionLicenses, licenseSchemaVersion, licensesByCatalog = {} } } = useSubscriptions();
  const { data: { redeemablePolicies } } = useRedeemablePolicies();
  const { data: { couponCodeAssignments } } = useCouponCodes();
  const { data: { currentEnterpriseOffers } } = useEnterpriseOffers();
  const catalogsForSubsidyRequests = useCatalogsForSubsidyRequests();

  // Strict v2: use only the catalogs in licensesByCatalog
  const searchCatalogs = useMemo(() => {
    if (licenseSchemaVersion === 'v2' && Object.keys(licensesByCatalog).length > 0) {
      return Object.keys(licensesByCatalog);
    }

    return getSearchCatalogs({
      redeemablePolicies,
      catalogsForSubsidyRequests,
      couponCodeAssignments,
      currentEnterpriseOffers,
      subscriptionLicense,
      subscriptionLicenses,
    });
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
