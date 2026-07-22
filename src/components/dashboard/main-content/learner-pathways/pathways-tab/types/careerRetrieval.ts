/**
 * Normalized learner difficulty tier used to scope career/taxonomy retrieval.
 */
export type CareerSearchLearnerLevel = 'introductory' | 'intermediate' | 'advanced';

/**
 * Normalized weekly time commitment tier used to scope career/taxonomy retrieval.
 */
export type CareerSearchTimeCommitment = 'short' | 'medium' | 'long';

/**
 * Deterministic search input for career/taxonomy retrieval. This is the normalized
 * Learning Intent response `fetchLearningIntent` returns — distinct from the canonical,
 * learner-authored `LearnerIntent` intake shape (career goal, target industry,
 * background, motivation), which this service never accepts.
 *
 * `condensedAlgoliaQuery` matches the field name already used by the real, checked-in
 * `LearningIntentResponse` (see `src/components/app/data/services/xpert.ts`) rather
 * than the unrelated `ai-pathways` prototype's `condensedQuery`.
 *
 * Only `condensedAlgoliaQuery`/`skillsRequired`/`skillsPreferred` are required, matching
 * the real, checked-in `LearningIntentResponse` today. The other 6 fields are optional
 * by design, not a temporary gap to paper over: the backend response schema is a plain
 * DRF serializer and can add them incrementally without this contract (or
 * `careerRetrievalService`) needing to block on that work landing first. As the backend
 * adds a field, `careerRetrievalService` picks it up automatically (it already treats
 * each of these defensively when absent); promote a field from optional to required
 * here only once the backend genuinely, durably supplies it.
 */
export interface CareerSearchIntent {
  condensedAlgoliaQuery: string;
  skillsRequired: string[];
  skillsPreferred: string[];
  roles?: string[];
  industries?: string[];
  jobSources?: string[];
  learnerLevel?: CareerSearchLearnerLevel;
  timeCommitment?: CareerSearchTimeCommitment;
  excludeTags?: string[];
}

/**
 * Facet vocabulary snapshot from the career/taxonomy index, used to ground
 * `CareerSearchIntent` skill signals against catalog-valid terms before they become
 * strict `facetFilters`. Much narrower than course retrieval's `CatalogFacetSnapshot` —
 * the jobs/taxonomy index only has `skills.name`, no `skill_names`/`subjects` equivalent,
 * and it isn't catalog/tenant-scoped.
 */
export interface CareerFacetSnapshot {
  'skills.name': string[];
}
