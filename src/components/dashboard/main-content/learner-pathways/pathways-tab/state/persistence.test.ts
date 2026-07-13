import { mergePathwaysState, partializePathwaysState } from './persistence';
import { getInitialPathwaysState } from './pathwaysStore';
import type { PathwaysStore } from './types';

const noop = () => {};

/** A full PathwaysStore shape (state + no-op actions) for pure-function testing. */
const buildStore = (stateOverrides: Partial<PathwaysStore> = {}): PathwaysStore => ({
  ...getInitialPathwaysState(),
  setSection: noop,
  setLearnerIntent: noop,
  selectCareer: noop,
  removeSelectedSkill: noop,
  restoreSelectedSkills: noop,
  commitProfileSuccess: noop,
  commitPathwayBuild: noop,
  resetPathwaysState: noop,
  ...stateOverrides,
});

describe('partializePathwaysState', () => {
  it('includes only the durable subset', () => {
    const store = buildStore({ learnerProfile: null });

    const persisted = partializePathwaysState(store);

    expect(Object.keys(persisted).sort()).toEqual([
      'careerMatches',
      'learnerIntent',
      'learnerProfile',
      'pathwayCourses',
      'pathwayInputFingerprint',
      'section',
      'selectedCareerId',
      'selectedSkills',
    ]);
  });

  it('does not include action functions', () => {
    const persisted = partializePathwaysState(buildStore());
    Object.values(persisted).forEach((value) => {
      expect(typeof value).not.toBe('function');
    });
  });
});

describe('mergePathwaysState', () => {
  it('layers a valid persisted subset onto the current (already-initialized) state', () => {
    const currentState = buildStore();
    const persistedState = {
      section: 'profile',
      selectedCareerId: 'career-1',
      careerMatches: [{ id: 'career-1', title: 'Data Analyst' }],
    };

    const merged = mergePathwaysState(persistedState, currentState);

    expect(merged.section).toBe('profile');
    expect(merged.selectedCareerId).toBe('career-1');
    expect(merged.careerMatches).toEqual([{ id: 'career-1', title: 'Data Analyst' }]);
    // Actions survive the merge (they only exist on currentState, not persistedState).
    expect(typeof merged.setSection).toBe('function');
  });

  it('keeps currentState defaults for fields absent from an older persisted blob', () => {
    const currentState = buildStore();
    // Simulates a pre-refactor (v1-shaped) persisted blob under old field names —
    // deliberately not migrated (see persistence.ts's version-bump comment): any
    // fields it doesn't share with the new shape simply keep their fresh defaults.
    const persistedState = { section: 'onboarding', onboarding: { answers: { goal: 'stale' } } };

    const merged = mergePathwaysState(persistedState, currentState);

    expect(merged.learnerIntent).toEqual(currentState.learnerIntent);
    expect(merged.pathwayInputFingerprint).toBeNull();
    // The old `onboarding` key rides along on the merged object (mergePathwaysState
    // spreads whatever the persisted blob contains) but is never read by any current
    // code — inert, not migrated. See pathwaysStorePersistence.test.ts for the fuller
    // v1-shaped-blob safe-fallback coverage.
    expect(merged).toHaveProperty('onboarding', { answers: { goal: 'stale' } });
  });

  it('falls back to currentState untouched when persistedState is not an object (malformed shape)', () => {
    const currentState = buildStore({
      section: 'profile',
      careerMatches: [{ id: 'career-1', title: 'Data Analyst' }],
    });

    expect(mergePathwaysState('not-an-object', currentState).section).toBe('profile');
    expect(mergePathwaysState(42, currentState).section).toBe('profile');
    expect(mergePathwaysState(null, currentState).section).toBe('profile');
    expect(mergePathwaysState(undefined, currentState).section).toBe('profile');
  });

  it('runs the normalization pass on the merged result', () => {
    const currentState = buildStore();
    const persistedState = {
      section: 'pathway',
      careerMatches: [{ id: 'career-1', title: 'Data Analyst' }],
      pathwayCourses: [],
      pathwayInputFingerprint: 'stale-fingerprint',
    };

    const merged = mergePathwaysState(persistedState, currentState);

    expect(merged.section).toBe('profile');
    expect(merged.pathwayInputFingerprint).toBeNull();
  });
});
