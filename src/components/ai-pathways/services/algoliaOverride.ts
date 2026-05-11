import { getAuthenticatedHttpClient } from '@edx/frontend-platform/auth';
import { getConfig } from '@edx/frontend-platform/config';

const OVERRIDE_PARAM = 'enterprise_customer_uuid';

/**
 * Dev-only override: reads an `?enterprise_customer_uuid=<uuid>` query param and,
 * if present, calls the enterprise-catalog service directly to obtain a secured Algolia
 * API key for that enterprise.
 *
 * This bypasses the normal BFF-issued key and is intended for local development and
 * QA testing against arbitrary enterprise catalogs without a full auth session.
 * Returns `null` when no override param is present or if the catalog call fails, so
 * normal key-fetching is unaffected in production.
 *
 * @param options Optional object accepting a `search` string; defaults to `window.location.search`.
 *   Pass a custom value in tests to avoid relying on `window.location`.
 * @returns A promise resolving to the secured Algolia API key string, or `null` if the
 *   override is not active or the request fails.
 */
export async function fetchSecuredAlgoliaKeyOverrideFromCatalog({
  search = (typeof window !== 'undefined' ? window.location.search : ''),
}: {
  search?: string;
} = {}): Promise<string | null> {
  const params = new URLSearchParams(search);
  const enterpriseCustomerUuid = params.get(OVERRIDE_PARAM);
  if (!enterpriseCustomerUuid) {
    return null;
  }

  const { ENTERPRISE_CATALOG_API_BASE_URL } = getConfig();
  if (!ENTERPRISE_CATALOG_API_BASE_URL) {
    return null;
  }

  try {
    const CATALOG_PROXY_PREFIX = '/__poc/enterprise-catalog';

    const url = `${CATALOG_PROXY_PREFIX}/api/v1/enterprise-customer/${enterpriseCustomerUuid}/secured-algolia-api-key/`;
    const resp = await getAuthenticatedHttpClient().get(url);

    // enterprise-catalog returns something like:
    // { algolia: { secured_api_key: "...", valid_until: "..." }, ... }
    // but camelCasing may already happen in some clients, so support both.
    const algolia = resp?.data?.algolia;
    return (
      algolia?.securedApiKey // camelCase
      ?? algolia?.secured_api_key // snake_case
      ?? null
    );
  } catch {
    return null;
  }
}
