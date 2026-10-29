import { getAuthenticatedHttpClient } from '@edx/frontend-platform/auth';
import { getConfig } from '@edx/frontend-platform/config';

export interface DebugModel {
  id: string;
  price_in: number;
  price_cached_in: number;
  price_out: number;
  /** Reasoning efforts this model accepts; `[null]` for models without reasoning. */
  efforts: Array<string | null>;
}

export interface DebugConfig {
  models: DebugModel[];
  defaults: {
    intent_model: string;
    intent_effort: string | null;
    compose_model: string;
    compose_effort: string | null;
  };
  catalog: string;
}

/**
 * enterprise-access base URL for Personalized Search. `PERSONALIZED_SEARCH_API_BASE_URL` points it
 * at a separate instance (for example a local development instance); otherwise it's `ENTERPRISE_ACCESS_BASE_URL`.
 */
export const getPersonalizedSearchApiBaseUrl = (): string => {
  const config = getConfig();
  return config.PERSONALIZED_SEARCH_API_BASE_URL || config.ENTERPRISE_ACCESS_BASE_URL;
};

/**
 * The debug model menu. Resolves to null when the server has debug overrides off (404), so the
 * panel can say the switcher is unavailable instead of offering choices the server would ignore.
 */
export const fetchDebugConfig = async (
  baseUrl: string,
  enterpriseCustomerUuid: string,
): Promise<DebugConfig | null> => {
  try {
    const { data } = await getAuthenticatedHttpClient().get(
      `${baseUrl}/api/v1/personalized-search/debug/`,
      { params: { enterprise_customer_uuid: enterpriseCustomerUuid } },
    );
    return data as DebugConfig;
  } catch (e) {
    if ((e as { response?: { status?: number } })?.response?.status === 404) { return null; }
    throw e;
  }
};
