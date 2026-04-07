import { querySubscriptions } from '../queries';
import useEnterpriseCustomer from './useEnterpriseCustomer';
import { useSuspenseBFF } from './useBFF';
import { buildCatalogIndex } from '../utils';

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

        // When the BFF sends an empty licensesByCatalog (v1 / flag-off), build the catalog
        // index client-side from subscriptionLicenses so that the indexed lookup path in
        // resolveApplicableSubscriptionLicense is always available.
        const normalizedData = (() => {
          if (!transformedData) { return transformedData; }
          const { licensesByCatalog, subscriptionLicenses } = transformedData;
          if (Object.keys(licensesByCatalog || {}).length === 0 && subscriptionLicenses?.length) {
            const rebuilt = buildCatalogIndex(subscriptionLicenses);
            // eslint-disable-next-line no-console
            console.debug('[multi-license] useSubscriptions: rebuilt licensesByCatalog client-side:', rebuilt);
            return { ...transformedData, licensesByCatalog: rebuilt };
          }
          return transformedData;
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
      select,
    },
  });
}
