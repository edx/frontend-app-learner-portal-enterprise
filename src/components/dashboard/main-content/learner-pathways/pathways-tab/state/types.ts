import type { LearnerIntent } from './learnerIntent';

export type { LearnerIntent };

/**
 * Tab-internal sections for learner pathways content.
 */
export type PathwaysSection =
  | 'onboarding'
  | 'profile'
  | 'pathway';

/**
 * Experience-level states shown in the learner pathways dashboard flow. Never stored
 * directly — always derived from canonical state via `derivePathwaysExperienceStatus`,
 * so it can never drift out of sync with the facts it summarizes.
 */
export type PathwaysExperienceStatus =
  | 'not_started'
  | 'onboarding_in_progress'
  | 'profile_ready'
  | 'pathway_ready'
  | 'pathway_in_progress'
  | 'pathway_completed';

/**
 * Generated/enriched learner profile output. Contains only data produced by profile
 * generation — the learner's own intent (career goal, target industry, background,
 * motivation) lives solely on `LearnerIntent`, never duplicated here.
 */
export interface LearnerProfile {
  summary: string;
  learningStyle: string;
  weeklyTimeCommitment: string;
  certificatePreference: string;
  skills: string[];
}

/**
 * Career option presented to the learner as a potential pathway anchor.
 */
export interface CareerMatch {
  id: string;
  title: string;
  matchPercentage?: number;
  laborMarketTrend?: string;
  skillsToDevelop?: string[];
}

/**
 * Course progression states used by learner pathways course cards/listing.
 */
export type PathwayCourseStatus =
  | 'not_started'
  | 'in_progress'
  | 'completed';

/**
 * Pathway course metadata scaffold. `courseKey` is the single canonical identifier —
 * used for React list keys, table row identity, and the future Recommendation Feedback
 * join field. No separate `id` is kept: nothing in the current integration distinguishes
 * a display identifier from a catalog join key.
 */
export interface PathwayCourse {
  courseKey: string;
  title: string;
  provider?: string;
  level?: string;
  length?: string;
  /** Populated from the Recommendation Feedback response's `reasons[courseKey]` entry. */
  whyThisFitsYou?: string;
  status: PathwayCourseStatus;
}

/**
 * Summary counts shown in dashboard/pathway progress states. Always derived from
 * `pathwayCourses` at render time (see `pathway-courses/utils.ts`) — never stored.
 */
export interface PathwayProgress {
  completed: number;
  inProgress: number;
  upcoming: number;
  totalCourses: number;
}

/**
 * Durable learner pathways state. Every field here is a canonical fact persisted under
 * its own name across RHF, Zustand, and localStorage — no renaming or projection layer
 * separates them.
 */
export interface PathwaysState {
  section: PathwaysSection;
  learnerIntent: LearnerIntent;
  learnerProfile: LearnerProfile | null;
  careerMatches: CareerMatch[];
  selectedCareerId: string | null;
  /**
   * Skills the learner has selected to develop for the currently selected career.
   * `null` means uninitialized (no valid selected career yet); `[]` means the learner
   * intentionally selected none. This is the canonical inclusion list pathway
   * generation actually consumes — not derived from a separate exclusion set.
   */
  selectedSkills: string[] | null;
  pathwayCourses: PathwayCourse[];
  /**
   * Deterministic fingerprint of the exact `PathwayGenerationRequest` that produced
   * `pathwayCourses`. `null` means no pathway has been built yet, or (after a v1-shaped
   * hydration) the historical request can't be trusted — treated as stale until rebuilt.
   * Metadata about the current pathway, not a second copy of the request itself.
   */
  pathwayInputFingerprint: string | null;
}

/** Input for the atomic Goal Summary / profile-generation success commit. */
export interface CommitProfileSuccessInput {
  learnerIntent: LearnerIntent;
  learnerProfile: LearnerProfile;
  careerMatches: CareerMatch[];
}

/** Input for the atomic pathway build/rebuild success commit. */
export interface CommitPathwayBuildInput {
  courses: PathwayCourse[];
  fingerprint: string;
}

/**
 * Mutable operations exposed by the learner pathways store.
 * All actions are synchronous setters with no orchestration or network calls.
 */
export interface PathwaysActions {
  setSection: (section: PathwaysSection) => void;
  setLearnerIntent: (learnerIntent: LearnerIntent) => void;
  /**
   * Atomically selects a career and (re)initializes its selected-skills list.
   * `recommendedSkills`, when supplied, is used verbatim instead of looking the
   * career up in `careerMatches` — needed when the caller is displaying a career
   * (e.g. a pre-generation stub/fallback) not yet present in committed state.
   */
  selectCareer: (careerId: string | null, recommendedSkills?: string[]) => void;
  removeSelectedSkill: (skill: string, recommendedSkills?: string[]) => void;
  restoreSelectedSkills: (recommendedSkills?: string[]) => void;
  /**
   * Atomically commits a successful Goal Summary / profile-generation result:
   * replaces the submitted intent, the generated profile, and career matches,
   * re-validates the selected career against the new matches, and (re)initializes
   * selected skills for the resulting selected career — all in one commit rather than
   * a sequence of setters. Never reconstructs `learnerIntent` from `learnerProfile`.
   */
  commitProfileSuccess: (input: CommitProfileSuccessInput) => void;
  /**
   * Atomically commits a successful pathway build/rebuild: replaces the complete
   * course set and records the fingerprint of the request that produced it, together.
   */
  commitPathwayBuild: (input: CommitPathwayBuildInput) => void;
  resetPathwaysState: () => void;
}

/**
 * Full learner pathways Zustand store contract.
 */
export type PathwaysStore = PathwaysState & PathwaysActions;
