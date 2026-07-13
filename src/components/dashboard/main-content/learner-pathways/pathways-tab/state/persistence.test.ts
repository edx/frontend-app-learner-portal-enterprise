import { mergePathwaysState, partializePathwaysState } from './persistence';
import { getInitialPathwaysState } from './pathwaysStore';
import type { PathwaysStore } from './types';

const noop = () => {};

/** A full PathwaysStore shape (state + no-op actions) for pure-function testing. */
const buildStore = (stateOverrides: Partial<PathwaysStore> = {}): PathwaysStore => ({
  ...getInitialPathwaysState(),
  setSection: noop,
  setExperienceStatus: noop,
  setCurrentQuestion: noop,
  setOnboardingComplete: noop,
  setOnboardingAnswer: noop,
  setOnboardingAnswers: noop,
  setLearnerProfile: noop,
  updateLearnerProfile: noop,
  setCareerMatches: noop,
  setSelectedCareerId: noop,
  selectCareer: noop,
  dismissSkill: noop,
  restoreSkills: noop,
  commitProfileSuccess: noop,
  setPathwayCourses: noop,
  updatePathwayCourse: noop,
  setProgress: noop,
  setLoading: noop,
  setError: noop,
  setPathwayBaseline: noop,
  commitPathwayBuild: noop,
  resetPathwaysState: noop,
  ...stateOverrides,
});

describe('partializePathwaysState', () => {
  it('includes only the durable subset', () => {
    const store = buildStore({
      learnerProfile: null,
      loading: {
        learnerProfile: true, careerMatches: false, pathwayCourses: false, pathwayProgress: false,
      },
      errors: {
        learnerProfile: 'boom', careerMatches: null, pathwayCourses: null, pathwayProgress: null,
      },
    });

    const persisted = partializePathwaysState(store);

    expect(Object.keys(persisted).sort()).toEqual([
      'careerMatches',
      'dismissedSkillKeys',
      'experienceStatus',
      'learnerProfile',
      'onboarding',
      'pathwayBaseline',
      'pathwayCourses',
      'section',
      'selectedCareerId',
    ]);
    // Explicitly excluded: transient fields never leave the store.
    expect(persisted).not.toHaveProperty('loading');
    expect(persisted).not.toHaveProperty('errors');
    expect(persisted).not.toHaveProperty('progress');
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
    // Simulates a persisted blob captured before `pathwayBaseline` existed.
    const persistedState = { section: 'onboarding' };

    const merged = mergePathwaysState(persistedState, currentState);

    expect(merged.pathwayBaseline).toBeNull();
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
      pathwayBaseline: {
        careerGoal: 'x', targetIndustry: 'x', background: 'x', motivation: 'x', selectedCareerId: null,
      },
    };

    const merged = mergePathwaysState(persistedState, currentState);

    expect(merged.section).toBe('profile');
    expect(merged.pathwayBaseline).toBeNull();
  });
});
