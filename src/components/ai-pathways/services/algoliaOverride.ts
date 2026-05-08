import { getAuthenticatedHttpClient } from '@edx/frontend-platform/auth';
import { getConfig } from '@edx/frontend-platform/config';
import {useEnterpriseCustomer} from "../../app/data";

const OVERRIDE_PARAM = 'enterprise_customer_uuid';

/**
 * Dev-only POC: If `?enterprise_customer_uuid=<uuid>` is present, call enterprise-catalog
 * directly to mint a secured Algolia search key for that enterprise.
 *
 * Returns `null` when no override is provided (or if the call fails).
 *
 * Catalog endpoint:
 *   GET /api/v1/enterprise-customer/{enterprise_uuid}/secured-algolia-api-key/
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
