import { camelCaseObject, getConfig } from '@edx/frontend-platform';
import { getAuthenticatedHttpClient } from '@edx/frontend-platform/auth';

/**
 * Input for `filterCourseKeysByEnterpriseCatalog`. `catalogUuids` must be the customer's
 * `searchCatalogs` UUIDs (the same space `useSearchCatalogs` returns) — not the separate
 * catalog-query-UUID space `useAlgoliaSearch` resolves for Algolia scoping.
 */
export interface EnterpriseCatalogInclusionInput {
  enterpriseCustomerUuid: string;
  catalogUuids: string[];
  candidateCourseKeys: string[];
}

/**
 * Stable, typed failure for this service: thrown for pre-flight input validation (a
 * non-empty candidate pool with no way to scope the inclusion check) and for a malformed
 * `filter_content_items` response shape. Never thrown to mask a legitimate "zero eligible
 * courses" result, and never swallows a network/non-2xx failure — those propagate as-is.
 */
export class EnterpriseCatalogInclusionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EnterpriseCatalogInclusionError';
  }
}

/** Trims, drops blanks, and deduplicates while preserving first-seen order. */
const normalizeUnique = (values: string[]): string[] => {
  const seen = new Set<string>();
  const normalized: string[] = [];
  values.forEach((rawValue) => {
    const value = rawValue.trim();
    if (value && !seen.has(value)) {
      seen.add(value);
      normalized.push(value);
    }
  });
  return normalized;
};

/**
 * Checks which Xpert candidate course keys (Phase 2's output) are included in an
 * enterprise customer's selected catalogs, via Enterprise Catalog's `filter_content_items`
 * endpoint — the same endpoint `fetchCourseRecommendations` (`app/data/services/course.ts`)
 * already calls for an unrelated feature. Duplicated here rather than extracted/shared,
 * since that existing call is untested in isolation and bundled with unrelated
 * recommendation-filtering logic; this POC keeps its own request small and self-contained.
 *
 * Enterprise Catalog's response is a membership set, not an ordering signal — the
 * returned array preserves the original, normalized Xpert candidate order, ignores
 * duplicate/unrequested keys the backend might echo back, and never applies a five-course
 * cap (that's Phase 5 orchestration's job, not this service's).
 *
 * @throws {EnterpriseCatalogInclusionError} When a non-empty candidate pool has no
 *   enterprise customer UUID or no catalog UUIDs to scope the check against, or when the
 *   response shape is malformed. Network/non-2xx failures propagate untouched — never
 *   treated as "zero eligible courses".
 */
export async function filterCourseKeysByEnterpriseCatalog(
  input: EnterpriseCatalogInclusionInput,
): Promise<string[]> {
  const normalizedCandidates = normalizeUnique(input.candidateCourseKeys);
  if (normalizedCandidates.length === 0) {
    return [];
  }

  const enterpriseCustomerUuid = input.enterpriseCustomerUuid?.trim();
  if (!enterpriseCustomerUuid) {
    throw new EnterpriseCatalogInclusionError(
      'enterpriseCustomerUuid is required to check catalog inclusion for a non-empty candidate pool.',
    );
  }

  const normalizedCatalogUuids = normalizeUnique(input.catalogUuids);
  if (normalizedCatalogUuids.length === 0) {
    throw new EnterpriseCatalogInclusionError(
      'catalogUuids must be non-empty to check catalog inclusion for a non-empty candidate pool.',
    );
  }

  const url = `${getConfig().ENTERPRISE_CATALOG_API_BASE_URL}/api/v1/enterprise-customer/${enterpriseCustomerUuid}/filter_content_items/`;

  // Unwrapped: a network/non-2xx rejection here propagates untouched to the caller —
  // no fallback, no retry.
  const response = await getAuthenticatedHttpClient().post(url, {
    content_keys: normalizedCandidates,
    catalog_uuids: normalizedCatalogUuids,
  });

  const { filteredContentKeys } = camelCaseObject(response.data);
  if (!Array.isArray(filteredContentKeys) || !filteredContentKeys.every((key: unknown) => typeof key === 'string')) {
    throw new EnterpriseCatalogInclusionError(
      'Enterprise Catalog filter_content_items response was not in the expected shape.',
    );
  }

  const eligibleKeys = new Set<string>(filteredContentKeys);
  return normalizedCandidates.filter((key) => eligibleKeys.has(key));
}
