import { normalizePathwaysState } from './normalize';
import type { PathwaysState, PathwaysStore } from './types';

/** Single localStorage key for the whole Learner Pathways durable subset. */
export const PATHWAYS_STORAGE_KEY = 'edx.learner-pathways.state';

/** Bump alongside a `migrate` function whenever the persisted shape actually changes. */
export const PATHWAYS_STORAGE_VERSION = 1;

/**
 * The durable subset of PathwaysState — deliberately excludes loading/errors/
 * constructedPayloads (transient/request-shaped) and `progress` (derived from
 * displayed courses at render time, not an independent fact).
 */
export type PersistedPathwaysState = Pick<
PathwaysState,
| 'section'
| 'experienceStatus'
| 'onboarding'
| 'learnerProfile'
| 'careerMatches'
| 'selectedCareerId'
| 'pathwayCourses'
| 'pathwayBaseline'
>;

export const partializePathwaysState = (state: PathwaysStore): PersistedPathwaysState => ({
  section: state.section,
  experienceStatus: state.experienceStatus,
  onboarding: state.onboarding,
  learnerProfile: state.learnerProfile,
  careerMatches: state.careerMatches,
  selectedCareerId: state.selectedCareerId,
  pathwayCourses: state.pathwayCourses,
  pathwayBaseline: state.pathwayBaseline,
});

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null
);

/**
 * Layers the persisted subset onto the store's own freshly-initialized state (so any
 * newly-introduced field not present in an older persisted blob keeps its default),
 * then runs one normalization pass so a broken/incomplete combination never reaches
 * a component. `persistedState` is untrusted (malformed JSON is already handled by
 * zustand's persist middleware falling back to `undefined` before this runs; this guard
 * covers valid-JSON-but-wrong-shape values, e.g. a persisted primitive).
 */
export const mergePathwaysState = (
  persistedState: unknown,
  currentState: PathwaysStore,
): PathwaysStore => {
  const merged: PathwaysStore = {
    ...currentState,
    ...(isRecord(persistedState) ? (persistedState as Partial<PersistedPathwaysState>) : {}),
  };
  return { ...merged, ...normalizePathwaysState(merged) };
};
