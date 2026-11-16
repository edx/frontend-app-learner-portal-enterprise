import type { ApiOptions } from '../http';

export interface DebugModel {
  id: string;
  /** Display name; `Xpert platform` for the `xpert` backend. */
  label?: string;
  /** USD per 1M tokens; null when the backend reports no token counts (Xpert). */
  price_in: number | null;
  price_cached_in: number | null;
  price_out: number | null;
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

export const getDebugConfigUrl = (baseUrl: string) => `${baseUrl}/api/v1/personalized-search/debug/`;

export interface DebugApi {
  /**
   * The debug model menu. Resolves to null when the server has debug overrides off (404), so the
   * panel can say the switcher is unavailable instead of offering choices the server would ignore.
   */
  fetchDebugConfig: (enterpriseCustomerUuid: string) => Promise<DebugConfig | null>;
}

export const createDebugApi = ({ getHttpClient, getBaseUrl }: ApiOptions): DebugApi => ({
  fetchDebugConfig: async (enterpriseCustomerUuid) => {
    try {
      const { data } = await getHttpClient().get(getDebugConfigUrl(getBaseUrl()), {
        params: { enterprise_customer_uuid: enterpriseCustomerUuid },
      });
      return data as DebugConfig;
    } catch (e) {
      if ((e as { response?: { status?: number } })?.response?.status === 404) { return null; }
      throw e;
    }
  },
});
