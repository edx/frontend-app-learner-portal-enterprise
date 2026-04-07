import { SearchIntent } from '../types';

/**
 * Stable intermediate structure for Algolia retrieval.
 */
export interface AlgoliaRequestInput {
  /** The primary text search query */
  query: string;

  /** Hard constraints (AND logic) */
  requiredFilters: Record<string, string[]>;

  /** Soft constraints for ranking influence (OR logic) */
  optionalFilters?: Record<string, string[]>;

  /** Negative constraints (NOT logic) */
  excludedFilters?: Record<string, string[]>;

  /** Metadata fields to return in hits */
  attributesToRetrieve: string[];

  /** Result count limit */
  hitsPerPage: number;

  /** Internal metadata for tracking/debugging */
  metadata: {
    source: 'ai-pathways';
    mode: 'bootstrap' | 'assembly' | 'refinement';
  };
}

/**
 * Configuration and context for building the request.
 */
export interface RequestBuilderParams {
  intent?: SearchIntent;
  mode: 'bootstrap' | 'assembly' | 'refinement';
  context: {
    enterpriseCustomerUuid?: string;
    catalogQueryUuids?: string[];
    locale?: string;
  };
}

/**
 * Standard set of attributes to retrieve from Algolia (Taxonomy index).
 */
export const DEFAULT_ATTRIBUTES_TO_RETRIEVE = [
  'id',
  'name',
  'description',
  'skills',
  'industry_names',
  'similar_jobs',
  'job_sources',
  'job_postings',
  'objectID',
];

/**
 * Maps semantic SearchIntent into a structured Algolia request input.
 *
 * @deprecated This builder is not used in the main AI Pathways flow.
 * The primary flow uses contentDiscoveryService functions directly.
 * Kept for reference and potential future use.
 *
 * IMPORTANT: Never use empty query ('') for bootstrap or assembly modes.
 * Always provide a seeded query string (2-5 words minimum).
 */
export function buildAlgoliaRequest(params: RequestBuilderParams): AlgoliaRequestInput {
  const { intent, mode, context } = params;

  // 1. Construct the query string
  let query = '';

  if (mode === 'bootstrap') {
    // Deterministic empty query for bootstrap
    query = '';
  } else if (intent) {
    if (intent.condensedQuery?.trim()) {
      query = intent.condensedQuery;
    }

    // For refined/assembly, construct from structured tokens
    const queryTokens = new Set<string>();
    (intent.roles || []).forEach(r => queryTokens.add(r));

    // Narrow queryTerms usage only if roles are empty
    if (!intent.roles?.length && intent.queryTerms?.length) {
      (intent.queryTerms || []).forEach(t => queryTokens.add(t));
    }

    const structuredQuery = Array.from(queryTokens)
      .join(' ')
      .trim();

    query = (structuredQuery || query)
      .replace(/[^\w\s]/gi, '') // Simple normalization to remove prose-like punctuation
      .toLowerCase();
  }

  // 2. Build Required Filters (AND logic)
  const requiredFilters: Record<string, string[]> = {};

  if (intent?.skillsRequired?.length) {
    requiredFilters['skills.name'] = intent.skillsRequired;
  }

  if (intent?.learnerLevel) {
    // Map learnerLevel if needed by the index, or use for ranking influence
  }

  // 3. Build Optional Filters (OR logic for ranking)
  const optionalFilters: Record<string, string[]> = {};

  if (intent?.skillsPreferred?.length) {
    optionalFilters['skills.name'] = intent.skillsPreferred;
  }

  if (intent?.roles?.length) {
    optionalFilters.name = intent.roles;
  }

  // 4. Build Excluded Filters (NOT logic)
  const excludedFilters: Record<string, string[]> = {};

  if (intent?.excludeTags?.length) {
    excludedFilters.industry_names = intent.excludeTags;
  }

  // 5. Apply Enterprise Context to Required Filters
  if (context.enterpriseCustomerUuid) {
    requiredFilters.enterprise_customer_uuid = [context.enterpriseCustomerUuid];
  }

  if (context.catalogQueryUuids?.length) {
    requiredFilters.catalog_query_uuids = context.catalogQueryUuids;
  }

  if (context.locale) {
    requiredFilters.locale = [context.locale];
  }

  return {
    query,
    requiredFilters,
    optionalFilters,
    excludedFilters,
    attributesToRetrieve: DEFAULT_ATTRIBUTES_TO_RETRIEVE,
    hitsPerPage: mode === 'assembly' ? 20 : 10,
    metadata: {
      source: 'ai-pathways',
      mode,
    },
  };
}
