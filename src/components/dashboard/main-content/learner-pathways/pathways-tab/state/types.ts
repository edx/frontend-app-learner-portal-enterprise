import type { LearningIntentResponse } from '../../../../../app/data/services';

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
 * Request payload placeholders used for future API integrations.
 * These remain generic in the scaffold phase until contracts are finalized.
 */
export interface PathwaysConstructedPayloads {
  learnerProfileRequest: Record<string, unknown> | null;
  pathwayRequest: Record<string, unknown> | null;
}

/**
 * Read-only slice of learner pathways store values.
 */
export interface PathwaysState {
  experienceStatus: PathwaysExperienceStatus;
  section: PathwaysSection;
  onboarding: OnboardingState;
  /** Learning Intent response, stored so Stage 2 (course search + Recommendation Feedback) can reuse its skills. */
  learningIntent: LearningIntentResponse | null;
  learnerProfile: LearnerProfile | null;
  careerMatches: CareerMatch[];
  selectedCareerId: string | null;
  pathwayCourses: PathwayCourse[];
  progress: PathwayProgress;
  loading: PathwaysLoadingState;
  errors: PathwaysErrorState;
  constructedPayloads: PathwaysConstructedPayloads;
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
  setLearningIntent: (learningIntent: LearningIntentResponse | null) => void;
  setLearnerProfile: (profile: LearnerProfile | null) => void;
  updateLearnerProfile: (profileUpdates: Partial<LearnerProfile>) => void;
  setCareerMatches: (matches: CareerMatch[]) => void;
  setSelectedCareerId: (careerId: string | null) => void;
  setPathwayCourses: (courses: PathwayCourse[]) => void;
  updatePathwayCourse: (courseId: string, updates: Partial<Omit<PathwayCourse, 'id'>>) => void;
  setProgress: (progress: PathwayProgress) => void;
  setLoading: (key: keyof PathwaysLoadingState, isLoading: boolean) => void;
  setError: (key: keyof PathwaysErrorState, errorMessage: string | null) => void;
  setConstructedPayload: <K extends keyof PathwaysConstructedPayloads>(
    key: K,
    payload: PathwaysConstructedPayloads[K]
  ) => void;
  clearConstructedPayloads: () => void;
  resetPathwaysState: () => void;
}

/**
 * Full learner pathways Zustand store contract.
 */
export type PathwaysStore = PathwaysState & PathwaysActions;
