import { getConfig } from '@edx/frontend-platform/config';

/**
 * enterprise-access base URL for Personalized Search, the one resolver every transport and API
 * client uses. `PERSONALIZED_SEARCH_API_BASE_URL` points it at a separate instance (for example a
 * local development instance); otherwise it's `ENTERPRISE_ACCESS_BASE_URL`.
 */
export const getPersonalizedSearchApiBaseUrl = (): string => {
  const config = getConfig();
  return config.PERSONALIZED_SEARCH_API_BASE_URL || config.ENTERPRISE_ACCESS_BASE_URL;
};

/** `PERSONALIZED_SEARCH_TRANSPORT`: `fixture`, `buffered`, `unavailable`, or unset for the default. */
export const getTransportSetting = (): string | null | undefined => getConfig().PERSONALIZED_SEARCH_TRANSPORT;
