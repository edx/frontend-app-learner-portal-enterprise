import { querySubscriptions } from '../queries';
import useEnterpriseCustomer from './useEnterpriseCustomer';
import { useSuspenseBFF } from './useBFF';

type UseSubscriptionsQueryOptionsSelectFnArgs = {
  original: unknown;
  transformed: unknown;
};

type UseSubscriptionsQueryOptions = {
  enabled?: boolean;
  select?: (data: UseSubscriptionsQueryOptionsSelectFnArgs) => unknown;
};

/**
 * Custom hook to get subscriptions data for the enterprise.
 * @returns The query results for the subscriptions.
 */
export default function useSubscriptions(queryOptions: UseSubscriptionsQueryOptions = {}) {
  const { data: enterpriseCustomer } = useEnterpriseCustomer<EnterpriseCustomer>();
  const { select } = queryOptions;

  return useSuspenseBFF({
    bffQueryOptions: {
      select: (data) => {
        const transformedData = data?.enterpriseCustomerUserSubsidies?.subscriptions;
        const multiLicenseFlag = data?.enterpriseFeatures?.enableMultiLicenseEntitlementsBff;
        const normalizedData = (() => {
          if (!transformedData) { return transformedData; }

          const hasLicensesByCatalog = Object.keys(transformedData.licensesByCatalog || {}).length > 0;
          const isMultiLicenseEnabled = multiLicenseFlag === false
            ? false
            : (multiLicenseFlag === true || hasLicensesByCatalog);

          // When the flag is ON, pass licensesByCatalog through for multi-license behaviour.
          // When the flag is OFF, strip licensesByCatalog so downstream consumers fall back
          // to the original single-license (master) behaviour.
          if (isMultiLicenseEnabled) {
            return transformedData;
          }

          return {
            ...transformedData,
            licensesByCatalog: {},
            subscriptionLicenses: transformedData.subscriptionLicense
              ? [transformedData.subscriptionLicense]
              : [],
          };
        })();

        // When custom `select` function is provided in `queryOptions`, call it with original and transformed data.
        if (select) {
          return select({
            original: data,
            transformed: normalizedData,
          });
        }

        // Otherwise, return the transformed data.
        return normalizedData;
      },
    },
    fallbackQueryConfig: {
      ...querySubscriptions(enterpriseCustomer.uuid),
      select: (data) => {
        const normalizedData = (() => {
          if (!data) { return data; }
          // The direct (non-BFF) API path never carries multi-license data,
          // so always use single-license (old master) behaviour.
          const typedData = data as { subscriptionLicense?: unknown };
          return {
            ...(data as object),
            licensesByCatalog: {},
            subscriptionLicenses: typedData.subscriptionLicense
              ? [typedData.subscriptionLicense]
              : [],
          };
        })();

        if (select) {
          return select({
            original: data,
            transformed: normalizedData,
          });
        }
        return normalizedData;
      },
    },
  });
}
