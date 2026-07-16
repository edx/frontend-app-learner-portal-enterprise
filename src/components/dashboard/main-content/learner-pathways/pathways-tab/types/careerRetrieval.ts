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
 * Learning Intent response `fetchLearningIntent` is expected to eventually return —
 * distinct from the canonical, learner-authored `LearnerIntent` intake shape (career
 * goal, target industry, background, motivation), which this service never accepts.
 *
 * `condensedAlgoliaQuery` matches the field name already used by the real, checked-in
 * `LearningIntentResponse` (see `src/components/app/data/services/xpert.ts`) rather
 * than the unrelated `ai-pathways` prototype's `condensedQuery`.
 */
export interface CareerSearchIntent {
  condensedAlgoliaQuery: string;
  roles: string[];
  skillsRequired: string[];
  skillsPreferred: string[];
  industries: string[];
  jobSources: string[];
  learnerLevel: CareerSearchLearnerLevel;
  timeCommitment: CareerSearchTimeCommitment;
  excludeTags: string[];
}
