/**
 * Experience-level states shown in the learner pathways dashboard flow.
 */
export type PathwaysExperienceStatus =
  | 'not_started'
  | 'onboarding_in_progress'
  | 'profile_ready'
  | 'pathway_ready'
  | 'pathway_in_progress'
  | 'pathway_completed';

/**
 * Tab-internal sections for learner pathways content.
 */
export type PathwaysSection =
  | 'onboarding'
  | 'profile'
  | 'pathway';

/**
 * Free-text onboarding answers captured from the initial questionnaire.
 */
export interface OnboardingAnswers {
  motivation: string;
  goal: string;
  background: string;
  industry: string;
}

/**
 * Onboarding quiz progression metadata.
 */
export interface OnboardingState {
  answers: OnboardingAnswers;
  currentQuestion: number;
  isComplete: boolean;
}

/**
 * Learner profile scaffold generated from onboarding responses.
 */
export interface LearnerProfile {
  summary: string;
  careerGoal: string;
  targetIndustry: string;
  background: string;
  motivation: string;
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
 * Pathway course metadata scaffold.
 */
export interface PathwayCourse {
  id: string;
  title: string;
  provider?: string;
  /** Stable backend/catalog join key used to match Recommendation Feedback `reasons` entries. */
  courseKey?: string;
  level?: string;
  length?: string;
  /** Populated from the Recommendation Feedback response's `reasons[courseKey]` entry. */
  whyThisFitsYou?: string;
  status: PathwayCourseStatus;
}

/**
 * Snapshot of the Goal Summary fields + selected career the current pathway was
 * generated (or last rebuilt) with. Compared against live values to derive whether
 * the learner has made relevant edits since then.
 */
export interface PathwayBaselineSnapshot {
  careerGoal: string;
  targetIndustry: string;
  background: string;
  motivation: string;
  selectedCareerId: string | null;
}

/**
 * Summary counts shown in dashboard/pathway progress states.
 */
export interface PathwayProgress {
  completed: number;
  inProgress: number;
  upcoming: number;
  totalCourses: number;
}

/**
 * Loading flags reserved for future async integrations.
 */
export interface PathwaysLoadingState {
  learnerProfile: boolean;
  careerMatches: boolean;
  pathwayCourses: boolean;
  pathwayProgress: boolean;
}

/**
 * Error placeholders reserved for future async integrations.
 */
export interface PathwaysErrorState {
  learnerProfile: string | null;
  careerMatches: string | null;
  pathwayCourses: string | null;
  pathwayProgress: string | null;
}

/**
 * Read-only slice of learner pathways store values.
 */
export interface PathwaysState {
  experienceStatus: PathwaysExperienceStatus;
  section: PathwaysSection;
  onboarding: OnboardingState;
  learnerProfile: LearnerProfile | null;
  careerMatches: CareerMatch[];
  selectedCareerId: string | null;
  pathwayCourses: PathwayCourse[];
  progress: PathwayProgress;
  loading: PathwaysLoadingState;
  errors: PathwaysErrorState;
  pathwayBaseline: PathwayBaselineSnapshot | null;
  /**
   * Skills the learner has dismissed from the current career's "skills to develop"
   * list. The canonical fact is the exclusion set, not the resulting visible list —
   * an empty inclusion list would be ambiguous between "nothing computed yet" and
   * "learner dismissed everything," whereas an empty exclusion set is unambiguous.
   */
  dismissedSkillKeys: string[];
}

/** Input for the atomic Goal Summary / profile-generation success commit. */
export interface CommitProfileSuccessInput {
  learnerProfile: LearnerProfile;
  careerMatches: CareerMatch[];
}

/** Input for the atomic pathway build/rebuild success commit. */
export interface CommitPathwayBuildInput {
  courses: PathwayCourse[];
  baseline: PathwayBaselineSnapshot;
}

/**
 * Mutable operations exposed by the learner pathways store.
 * All actions are synchronous setters with no orchestration or network calls.
 */
export interface PathwaysActions {
  setSection: (section: PathwaysSection) => void;
  setExperienceStatus: (status: PathwaysExperienceStatus) => void;
  setCurrentQuestion: (questionNumber: number) => void;
  setOnboardingComplete: (isComplete: boolean) => void;
  setOnboardingAnswer: <K extends keyof OnboardingAnswers>(questionKey: K, value: OnboardingAnswers[K]) => void;
  setOnboardingAnswers: (answers: OnboardingAnswers) => void;
  setLearnerProfile: (profile: LearnerProfile | null) => void;
  updateLearnerProfile: (profileUpdates: Partial<LearnerProfile>) => void;
  setCareerMatches: (matches: CareerMatch[]) => void;
  setSelectedCareerId: (careerId: string | null) => void;
  /** Atomically selects a career and resets dismissed-skill state for it. */
  selectCareer: (careerId: string | null) => void;
  dismissSkill: (skill: string) => void;
  restoreSkills: () => void;
  /**
   * Atomically commits a successful Goal Summary / profile-generation result:
   * replaces the profile, the corresponding intake answers, and career matches,
   * re-validates the selected career against the new matches, and resets dismissed
   * skills — all in one commit rather than a sequence of setters.
   */
  commitProfileSuccess: (input: CommitProfileSuccessInput) => void;
  setPathwayCourses: (courses: PathwayCourse[]) => void;
  updatePathwayCourse: (courseId: string, updates: Partial<Omit<PathwayCourse, 'id'>>) => void;
  setProgress: (progress: PathwayProgress) => void;
  setLoading: (key: keyof PathwaysLoadingState, isLoading: boolean) => void;
  setError: (key: keyof PathwaysErrorState, errorMessage: string | null) => void;
  setPathwayBaseline: (baseline: PathwayBaselineSnapshot | null) => void;
  /**
   * Atomically commits a successful pathway build/rebuild: replaces the complete
   * course set (removing stale courses and their feedback in the same replace) and
   * updates the generation baseline together, rather than as separate setter calls.
   */
  commitPathwayBuild: (input: CommitPathwayBuildInput) => void;
  resetPathwaysState: () => void;
}

/**
 * Full learner pathways Zustand store contract.
 */
export type PathwaysStore = PathwaysState & PathwaysActions;
