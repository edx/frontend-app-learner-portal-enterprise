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
        const normalizedData = (() => {
          if (!transformedData) { return transformedData; }
          const { licenseSchemaVersion, licensesByCatalog } = transformedData;
          const hasLicensesByCatalog = Object.keys(licensesByCatalog || {}).length > 0;

          if (licenseSchemaVersion === 'v1') {
            return { ...transformedData, licensesByCatalog: {} };
          }

          if (licenseSchemaVersion === 'v2' && hasLicensesByCatalog) {
            return transformedData;
          }

          return { ...transformedData, licensesByCatalog: {} };
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
          if (!data) return data;
          const { licenseSchemaVersion, licensesByCatalog } = data as {
            licenseSchemaVersion?: string;
            licensesByCatalog: Record<string, unknown[]>;
          };
          const hasLicensesByCatalog = licensesByCatalog && Object.keys(licensesByCatalog).length > 0;

          if (licenseSchemaVersion === 'v1') {
            return { ...data, licensesByCatalog: {} };
          }

          if (licenseSchemaVersion === 'v2' && hasLicensesByCatalog) {
            return data;
          }

          return { ...data, licensesByCatalog: {} };
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
