import { create } from 'zustand';

import { logInfo } from '@edx/frontend-platform/logging';
import {
  CareerMatch, LearnerProfile,
  OnboardingAnswers,
  PathwaysErrorState,
  PathwaysLoadingState,
  PathwaysState,
  PathwaysStore,
} from './types';

/**
 * Factory for creating a fresh pathways initial state object.
 * This prevents shared object references between runtime resets and tests.
 */
export const getInitialPathwaysState = (): PathwaysState => ({
  experienceStatus: 'not_started',
  section: 'dashboard',
  onboarding: {
    answers: {
      motivation: '',
      goal: '',
      background: '',
      industries: '',
    },
    currentQuestion: 0,
    isComplete: false,
  },
  learnerProfile: null,
  careerMatches: [],
  selectedCareerId: null,
  pathwayCourses: [],
  progress: {
    completed: 0,
    inProgress: 0,
    upcoming: 0,
    totalCourses: 0,
  },
  loading: {
    learnerProfile: false,
    careerMatches: false,
    pathwayCourses: false,
    pathwayProgress: false,
  },
  errors: {
    learnerProfile: null,
    careerMatches: null,
    pathwayCourses: null,
    pathwayProgress: null,
  },
  constructedPayloads: {
    learnerProfileRequest: null,
    pathwayRequest: null,
  },
});

/**
 * Root Zustand store for learner pathways.
 * Holds only state, synchronous setters, and reset behavior.
 */
export const usePathwaysStore = create<PathwaysStore>((set) => ({
  ...getInitialPathwaysState(),
  setSection: (section) => set({ section }),
  setExperienceStatus: (experienceStatus) => set({ experienceStatus }),
  setCurrentQuestion: (currentQuestion) => set((state) => ({
    onboarding: {
      ...state.onboarding,
      currentQuestion,
    },
  })),
  setOnboardingComplete: (isComplete) => set((state) => ({
    onboarding: {
      ...state.onboarding,
      isComplete,
    },
  })),
  setOnboardingAnswer: (questionKey, value) => set((state) => ({
    onboarding: {
      ...state.onboarding,
      answers: {
        ...state.onboarding.answers,
        [questionKey]: value,
      },
    },
  })),
  setOnboardingAnswers: (answers) => set((state) => ({
    onboarding: {
      ...state.onboarding,
      answers,
    },
  })),
  setLearnerProfile: (learnerProfile) => set({ learnerProfile }),
  updateLearnerProfile: (
    profileUpdates: Partial<LearnerProfile>,
  ) => set((state) => {
    if (!state.learnerProfile) {
      // Invariant/Assumption violation.
      // updateLearnerProfile should only be called after setLearnerProfile.
      logInfo(
        'updateLearnerProfile called before learnerProfile initialization',
        profileUpdates,
      );
      return {};
    }

    return {
      learnerProfile: {
        ...state.learnerProfile,
        ...profileUpdates,
      },
    };
  }),
  setCareerMatches: (careerMatches) => set({ careerMatches }),
  setSelectedCareerId: (selectedCareerId) => set({ selectedCareerId }),
  setPathwayCourses: (pathwayCourses) => set({ pathwayCourses }),
  updatePathwayCourse: (courseId, updates) => set((state) => ({
    pathwayCourses: state.pathwayCourses.map((course) => (
      course.id === courseId ? { ...course, ...updates } : course
    )),
  })),
  setProgress: (progress) => set({ progress }),
  setLoading: (key, isLoading) => set((state) => ({
    loading: {
      ...state.loading,
      [key]: isLoading,
    },
  })),
  setError: (key, errorMessage) => set((state) => ({
    errors: {
      ...state.errors,
      [key]: errorMessage,
    },
  })),
  setConstructedPayload: (key, payload) => set((state) => ({
    constructedPayloads: {
      ...state.constructedPayloads,
      [key]: payload,
    },
  })),
  clearConstructedPayloads: () => set({
    constructedPayloads: {
      learnerProfileRequest: null,
      pathwayRequest: null,
    },
  }),
  resetPathwaysState: () => set(getInitialPathwaysState()),
}));

/**
 * Selector helpers for narrow subscriptions and testable getter composition.
 */
export const selectors = {
  experienceStatus: (state: PathwaysStore) => state.experienceStatus,
  section: (state: PathwaysStore) => state.section,
  onboardingAnswers: (state: PathwaysStore) => state.onboarding.answers,
  onboarding: (state: PathwaysStore) => state.onboarding,
  learnerProfile: (state: PathwaysStore) => state.learnerProfile,
  careerMatches: (state: PathwaysStore) => state.careerMatches,
  selectedCareerId: (state: PathwaysStore) => state.selectedCareerId,
  selectedCareerMatch: (state: PathwaysStore): CareerMatch | null => (
    state.careerMatches.find((match) => match.id === state.selectedCareerId) || null
  ),
  pathwayCourses: (state: PathwaysStore) => state.pathwayCourses,
  progress: (state: PathwaysStore) => state.progress,
  loading: (state: PathwaysStore) => state.loading,
  errors: (state: PathwaysStore) => state.errors,
  constructedPayloads: (state: PathwaysStore) => state.constructedPayloads,
};

/**
 * Hook wrappers for common learner pathways state slices.
 */
export const usePathwaysExperienceStatus = () => usePathwaysStore(selectors.experienceStatus);
export const usePathwaysSection = () => usePathwaysStore(selectors.section);
export const usePathwaysOnboardingAnswers = () => usePathwaysStore(selectors.onboardingAnswers);
export const usePathwaysOnboarding = () => usePathwaysStore(selectors.onboarding);
export const usePathwaysLearnerProfile = () => usePathwaysStore(selectors.learnerProfile);
export const usePathwaysCareerMatches = () => usePathwaysStore(selectors.careerMatches);
export const usePathwaysSelectedCareerId = () => usePathwaysStore(selectors.selectedCareerId);
export const useSelectedCareerMatch = () => usePathwaysStore(selectors.selectedCareerMatch);
export const usePathwaysCourses = () => usePathwaysStore(selectors.pathwayCourses);
export const usePathwaysProgress = () => usePathwaysStore(selectors.progress);
export const usePathwaysLoading = () => usePathwaysStore(selectors.loading);
export const usePathwaysErrors = () => usePathwaysStore(selectors.errors);
export const usePathwaysConstructedPayloads = () => usePathwaysStore(selectors.constructedPayloads);

/**
 * Typed helper exports used by tests and consuming modules.
 */
export type {
  OnboardingAnswers,
  PathwaysErrorState,
  PathwaysLoadingState,
};
