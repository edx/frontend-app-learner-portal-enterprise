import { normalizePathwaysState, orderDisplayableCareerMatches } from './normalize';
import type { PathwaysState, PathwaysStore } from './types';

/** Single localStorage key for the whole Learner Pathways durable subset. */
export const PATHWAYS_STORAGE_KEY = 'edx.learner-pathways.state';

/**
 * Kept at 1 by explicit decision: this persistence feature has never shipped past
 * unmerged development branches, so there is no real user data to migrate. A
 * pre-refactor persisted blob simply doesn't carry any of the field names below, so
 * it hydrates as fresh defaults for those fields via `mergePathwaysState` below —
 * any of its own now-unused keys (e.g. `onboarding`, `dismissedSkillKeys`,
 * `pathwayBaseline`) land on the merged object but are never read by current code.
 * Bump alongside a real `migrate` function once this ships and real user data exists.
 */
export const PATHWAYS_STORAGE_VERSION = 1;

/**
 * The durable subset of PathwaysState — deliberately excludes derived/transient
 * values: `pathwayInputFingerprint` is metadata about `pathwayCourses`, not excluded,
 * but loading/error state (transient) has no place here at all (see
 * hooks/usePathwaysRequestState.ts), and `progress` is derived from displayed courses
 * at render time, not an independent fact.
 */
export type PersistedPathwaysState = Pick<
PathwaysState,
| 'section'
| 'learnerIntent'
| 'learnerProfile'
| 'careerMatches'
| 'selectedCareerId'
| 'selectedSkills'
| 'pathwayCourses'
| 'pathwayInputFingerprint'
>;

export const partializePathwaysState = (state: PathwaysStore): PersistedPathwaysState => ({
  section: state.section,
  learnerIntent: state.learnerIntent,
  learnerProfile: state.learnerProfile,
  // Only the careers actually rendered are worth persisting — one with no skills (or
  // below the minimum visible match threshold) never shows up as a selectable option.
  careerMatches: orderDisplayableCareerMatches(state.careerMatches),
  selectedCareerId: state.selectedCareerId,
  selectedSkills: state.selectedSkills,
  pathwayCourses: state.pathwayCourses,
  pathwayInputFingerprint: state.pathwayInputFingerprint,
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
 * covers valid-JSON-but-wrong-shape values, e.g. a persisted primitive, or a
 * pre-refactor blob under the old shape).
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
