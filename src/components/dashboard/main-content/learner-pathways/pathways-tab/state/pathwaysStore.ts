import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { EMPTY_LEARNER_INTENT } from './learnerIntent';
import {
  CareerMatch,
  PathwaysState,
  PathwaysStore,
} from './types';
import {
  PATHWAYS_STORAGE_KEY,
  PATHWAYS_STORAGE_VERSION,
  mergePathwaysState,
  partializePathwaysState,
} from './persistence';
import { normalizeSelectedCareerId, recommendedSkillsForCareer } from './normalize';

/**
 * Factory for creating a fresh pathways initial state object.
 * This prevents shared object references between runtime resets and tests.
 */
export const getInitialPathwaysState = (): PathwaysState => ({
  section: 'onboarding',
  learnerIntent: { ...EMPTY_LEARNER_INTENT },
  learnerProfile: null,
  careerMatches: [],
  selectedCareerId: null,
  selectedSkills: null,
  pathwayCourses: [],
  pathwayInputFingerprint: null,
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
  setLearnerIntent: (learnerIntent) => set({ learnerIntent }),
  // `recommendedSkills` lets a caller (CareerSelectionContainer) supply the target
  // career's recommended list explicitly when it isn't yet present in
  // `state.careerMatches` — e.g. the pre-generation stub-display career shown before
  // any real profile/career-matches commit exists. Omitted, it derives from
  // `state.careerMatches` as normal.
  selectCareer: (selectedCareerId, recommendedSkills) => set((state) => (
    state.selectedCareerId === selectedCareerId
      ? { selectedCareerId }
      : {
        selectedCareerId,
        selectedSkills: recommendedSkills ?? recommendedSkillsForCareer(state.careerMatches, selectedCareerId),
      }
  )),
  removeSelectedSkill: (skill, recommendedSkills) => set((state) => {
    const currentSkills = state.selectedSkills ?? recommendedSkills ?? [];
    return {
      selectedSkills: currentSkills.filter((candidate) => candidate !== skill),
    };
  }),
  restoreSelectedSkills: (recommendedSkills) => set((state) => ({
    selectedSkills: recommendedSkills ?? recommendedSkillsForCareer(state.careerMatches, state.selectedCareerId),
  })),
  commitProfileSuccess: ({ learnerIntent, learnerProfile, careerMatches }) => set((state) => {
    const selectedCareerId = normalizeSelectedCareerId(careerMatches, state.selectedCareerId);
    return {
      learnerIntent,
      learnerProfile,
      careerMatches,
      selectedCareerId,
      selectedSkills: recommendedSkillsForCareer(careerMatches, selectedCareerId),
    };
  }),
  commitPathwayBuild: ({ courses, fingerprint }) => set({
    pathwayCourses: courses,
    pathwayInputFingerprint: fingerprint,
  }),
  commitStubProfile: ({ learnerProfile, careerMatches }) => set({ learnerProfile, careerMatches }),
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
  section: (state: PathwaysStore) => state.section,
  learnerIntent: (state: PathwaysStore) => state.learnerIntent,
  learnerProfile: (state: PathwaysStore) => state.learnerProfile,
  careerMatches: (state: PathwaysStore) => state.careerMatches,
  selectedCareerId: (state: PathwaysStore) => state.selectedCareerId,
  selectedCareerMatch: (state: PathwaysStore): CareerMatch | null => (
    state.careerMatches.find((match) => match.id === state.selectedCareerId) || null
  ),
  selectedSkills: (state: PathwaysStore) => state.selectedSkills,
  pathwayCourses: (state: PathwaysStore) => state.pathwayCourses,
  pathwayInputFingerprint: (state: PathwaysStore) => state.pathwayInputFingerprint,
};

/**
 * Hook wrappers for common learner pathways state slices.
 */
export const usePathwaysSection = () => usePathwaysStore(selectors.section);
export const usePathwaysLearnerIntent = () => usePathwaysStore(selectors.learnerIntent);
export const usePathwaysLearnerProfile = () => usePathwaysStore(selectors.learnerProfile);
export const usePathwaysCareerMatches = () => usePathwaysStore(selectors.careerMatches);
export const usePathwaysSelectedCareerId = () => usePathwaysStore(selectors.selectedCareerId);
export const useSelectedCareerMatch = () => usePathwaysStore(selectors.selectedCareerMatch);
export const usePathwaysSelectedSkills = () => usePathwaysStore(selectors.selectedSkills);
export const usePathwaysCourses = () => usePathwaysStore(selectors.pathwayCourses);
export const usePathwayInputFingerprint = () => usePathwaysStore(selectors.pathwayInputFingerprint);
