import qs from 'query-string';
import { getAuthenticatedHttpClient } from '@edx/frontend-platform/auth';
import { getConfig } from '@edx/frontend-platform/config';

export function fetchEnterpriseCustomerSubscriptionPlan(enterpriseUUID) {
  const queryParams = {
    enterprise_customer_uuid: enterpriseUUID,
  };
  const config = getConfig();
  const url = `${config.LICENSE_MANAGER_URL}/api/v1/learner-subscriptions/?${qs.stringify(queryParams)}`;
  const httpClient = getAuthenticatedHttpClient({
    useCache: config.USE_API_CACHE,
  });
  return httpClient.get(url);
}

export function fetchSubscriptionLicensesForUser(enterpriseUUID) {
  const queryParams = {
    enterprise_customer_uuid: enterpriseUUID,
  };
  const config = getConfig();
  const url = `${config.LICENSE_MANAGER_URL}/api/v1/learner-licenses/?${qs.stringify(queryParams)}`;
  return getAuthenticatedHttpClient().get(url);
}
