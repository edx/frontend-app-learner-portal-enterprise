/**
 * Constants for catalog and career retrieval via Algolia.
 *
 * Used in: courseRetrieval, careerRetrieval, and catalogFacetService.
 * Extend when adjusting search limits or adding new facet fields.
 */

export const COURSE_RETRIEVAL_LIMIT = 5;
export const CAREER_RETRIEVAL_LIMIT = 10;
export const MIN_RESULTS_THRESHOLD = 3;
export const MAX_VALUES_PER_FACET = 1000;

export const CONTENT_TYPE_COURSE = 'content_type:course';

export const FACET_FIELDS = {
  SKILL_NAMES: 'skill_names',
  SKILLS_DOT_NAME: 'skills.name',
  SUBJECTS: 'subjects',
  LEVEL_TYPE: 'level_type',
  PARTNERS_NAME: 'partners.name',
  ENTERPRISE_CATALOG_QUERY_UUIDS: 'enterprise_catalog_query_uuids',
  INDUSTRY_NAMES: 'industry_names',
  JOB_SOURCES: 'job_sources',
} as const;

export const RETRIEVAL_LADDER_STEPS = {
  STRICT: 'Strict Facet Matching',
  BOOST: 'Boosted Optional Filters',
  QUERY_ALTERNATE: 'Query Alternate',
  FALLBACK: 'Scope Only Fallback',
} as const;
