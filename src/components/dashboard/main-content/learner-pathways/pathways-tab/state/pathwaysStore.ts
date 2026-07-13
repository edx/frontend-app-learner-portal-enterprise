import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { logInfo } from '@edx/frontend-platform/logging';
import {
  CareerMatch,
  LearnerProfile,
  OnboardingAnswers,
  PathwaysErrorState,
  PathwaysLoadingState,
  PathwaysState,
  PathwaysStore,
} from './types';
import {
  PATHWAYS_STORAGE_KEY,
  PATHWAYS_STORAGE_VERSION,
  mergePathwaysState,
  partializePathwaysState,
} from './persistence';
import { normalizeSelectedCareerId } from './normalize';
import { mapProfileToOnboardingAnswers } from './mappers';

/**
 * Factory for creating a fresh pathways initial state object.
 * This prevents shared object references between runtime resets and tests.
 */
export const getInitialPathwaysState = (): PathwaysState => ({
  experienceStatus: 'not_started',
  section: 'onboarding',
  onboarding: {
    answers: {
      motivation: '',
      goal: '',
      background: '',
      industry: '',
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
  pathwayBaseline: null,
  dismissedSkillKeys: [],
});

/**
 * Root Zustand store for learner pathways.
 * Holds only state, synchronous setters, and reset behavior.
 * Wrapped in `persist` so the durable subset (see state/persistence.ts) survives a
 * refresh; hydration is synchronous for localStorage, so the store's initial state is
 * already hydrated before first render — no separate "waiting for hydration" step.
 */
export const usePathwaysStore = create<PathwaysStore>()(persist((set) => ({
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
  selectCareer: (selectedCareerId) => set((state) => (
    state.selectedCareerId === selectedCareerId
      ? { selectedCareerId }
      : { selectedCareerId, dismissedSkillKeys: [] }
  )),
  dismissSkill: (skill) => set((state) => (
    state.dismissedSkillKeys.includes(skill)
      ? {}
      : { dismissedSkillKeys: [...state.dismissedSkillKeys, skill] }
  )),
  restoreSkills: () => set({ dismissedSkillKeys: [] }),
  commitProfileSuccess: ({ learnerProfile, careerMatches }) => set((state) => ({
    learnerProfile,
    onboarding: {
      ...state.onboarding,
      answers: mapProfileToOnboardingAnswers(learnerProfile),
    },
    careerMatches,
    selectedCareerId: normalizeSelectedCareerId(careerMatches, state.selectedCareerId),
    dismissedSkillKeys: [],
  })),
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
  setPathwayBaseline: (pathwayBaseline) => set({ pathwayBaseline }),
  resetPathwaysState: () => set(getInitialPathwaysState()),
}), {
  name: PATHWAYS_STORAGE_KEY,
  version: PATHWAYS_STORAGE_VERSION,
  partialize: partializePathwaysState,
  merge: mergePathwaysState,
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
  pathwayBaseline: (state: PathwaysStore) => state.pathwayBaseline,
  dismissedSkillKeys: (state: PathwaysStore) => state.dismissedSkillKeys,
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
export const usePathwayBaseline = () => usePathwaysStore(selectors.pathwayBaseline);
export const useDismissedSkillKeys = () => usePathwaysStore(selectors.dismissedSkillKeys);

/**
 * Typed helper exports used by tests and consuming modules.
 */
export type {
  OnboardingAnswers,
  PathwaysErrorState,
  PathwaysLoadingState,
};
