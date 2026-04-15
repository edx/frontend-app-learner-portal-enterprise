/**
 * Constants for catalog and career retrieval via Algolia.
 * These govern how searches are performed against the taxonomy and course catalogs.
 *
 * Used in: courseRetrieval.ts, careerRetrieval.ts, and catalogFacetService.ts.
 */

/** Maximum number of courses to include in a generated pathway. */
export const COURSE_RETRIEVAL_LIMIT = 5;

/** Maximum number of career paths to suggest to the user during intake. */
export const CAREER_RETRIEVAL_LIMIT = 10;

/** Minimum number of course results required before stopping the retrieval ladder. */
export const MIN_RESULTS_THRESHOLD = 3;

/** Maximum number of facet values to fetch from Algolia (to ensure high coverage). */
export const MAX_VALUES_PER_FACET = 1000;

/** Algolia filter string to restrict results to courses. */
export const CONTENT_TYPE_COURSE = 'content_type:course';

/**
 * Mapping of internal facet identifiers to Algolia index field names.
 */
export const FACET_FIELDS = {
  /** Primary skill name field in the catalog. */
  SKILL_NAMES: 'skill_names',
  /** Alternative skill name field (often used in nested objects). */
  SKILLS_DOT_NAME: 'skills.name',
  /** High-level topical categories. */
  SUBJECTS: 'subjects',
  /** Difficulty level (e.g., Beginner, Advanced). */
  LEVEL_TYPE: 'level_type',
  /** Content provider names. */
  PARTNERS_NAME: 'partners.name',
  /** Security scoping field for enterprise catalogs. */
  ENTERPRISE_CATALOG_QUERY_UUIDS: 'enterprise_catalog_query_uuids',
  /** Industry names (used in the taxonomy index). */
  INDUSTRY_NAMES: 'industry_names',
  /** Data sources (used in the taxonomy index). */
  JOB_SOURCES: 'job_sources',
} as const;

/**
 * Human-readable labels for the stages of the progressive search "ladder".
 */
export const RETRIEVAL_LADDER_STEPS = {
  /** Most restrictive: matches exact skills as strict facet filters. */
  STRICT: 'Strict Facet Matching',
  /** Moderate: uses skills as optional (boosting) filters for higher recall. */
  BOOST: 'Boosted Optional Filters',
  /** Broad: uses alternative AI-generated queries. */
  QUERY_ALTERNATE: 'Query Alternate',
  /** Broadest: fall back to a simple keyword search within the scoped catalog. */
  FALLBACK: 'Scope Only Fallback',
} as const;
