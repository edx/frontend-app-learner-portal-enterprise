import { PATHWAYS_STORAGE_KEY, PATHWAYS_STORAGE_VERSION } from './persistence';

/**
 * Hydration happens synchronously against localStorage the moment `pathwaysStore.ts` is
 * evaluated, so these tests seed localStorage and then re-require the module fresh (via
 * `jest.resetModules`) to exercise that module-load-time behavior — importing it once at
 * the top of the file would only ever hydrate against whatever localStorage held first.
 */
describe('usePathwaysStore <-> localStorage', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.resetModules();
  });

  it('starts at the initial state when localStorage is empty', () => {
    // eslint-disable-next-line global-require
    const { usePathwaysStore } = require('./pathwaysStore');
    expect(usePathwaysStore.getState().section).toBe('onboarding');
    expect(usePathwaysStore.getState().learnerProfile).toBeNull();
  });

  it('hydrates from a previously persisted, valid value', () => {
    localStorage.setItem(PATHWAYS_STORAGE_KEY, JSON.stringify({
      state: {
        section: 'profile',
        careerMatches: [{ id: 'career-1', title: 'Data Analyst' }],
        selectedCareerId: 'career-1',
      },
      version: PATHWAYS_STORAGE_VERSION,
    }));

    // eslint-disable-next-line global-require
    const { usePathwaysStore } = require('./pathwaysStore');

    expect(usePathwaysStore.getState().section).toBe('profile');
    expect(usePathwaysStore.getState().selectedCareerId).toBe('career-1');
  });

  it('merges a partial persisted blob with defaults for fields it does not contain', () => {
    localStorage.setItem(PATHWAYS_STORAGE_KEY, JSON.stringify({
      state: {
        section: 'onboarding',
        learnerIntent: {
          motivation: 'Grow', careerGoal: '', background: '', targetIndustry: '',
        },
      },
      version: PATHWAYS_STORAGE_VERSION,
    }));

    // eslint-disable-next-line global-require
    const { usePathwaysStore } = require('./pathwaysStore');

    expect(usePathwaysStore.getState().learnerIntent.motivation).toBe('Grow');
    expect(usePathwaysStore.getState().pathwayInputFingerprint).toBeNull();
    expect(usePathwaysStore.getState().pathwayCourses).toEqual([]);
  });

  it('normalizes an invalid persisted combination during hydration', () => {
    localStorage.setItem(PATHWAYS_STORAGE_KEY, JSON.stringify({
      state: { section: 'pathway', careerMatches: [{ id: 'career-1', title: 'Data Analyst' }], pathwayCourses: [] },
      version: PATHWAYS_STORAGE_VERSION,
    }));

    // eslint-disable-next-line global-require
    const { usePathwaysStore } = require('./pathwaysStore');

    expect(usePathwaysStore.getState().section).toBe('profile');
  });

  it('falls back to the initial state when the stored value is malformed JSON', () => {
    localStorage.setItem(PATHWAYS_STORAGE_KEY, '{not valid json');

    // eslint-disable-next-line global-require
    const { usePathwaysStore } = require('./pathwaysStore');

    expect(usePathwaysStore.getState().section).toBe('onboarding');
    expect(usePathwaysStore.getState().learnerProfile).toBeNull();
  });

  it('falls back to fresh defaults (does not migrate or throw) for a pre-refactor v1-shaped blob', () => {
    // No migrate function is registered (PATHWAYS_STORAGE_VERSION intentionally stays at
    // 1 — see persistence.ts) — this is the explicit, user-directed deviation from the
    // "migrate without clearing data" requirement: old field names are simply absent
    // from the new shape, so they fall through to fresh defaults rather than throwing.
    localStorage.setItem(PATHWAYS_STORAGE_KEY, JSON.stringify({
      state: {
        section: 'profile',
        experienceStatus: 'pathway_ready',
        onboarding: {
          answers: {
            motivation: 'Grow', goal: 'Old Goal', background: 'Ops', industry: 'Old Industry',
          },
          currentQuestion: 1,
          isComplete: true,
        },
        learnerProfile: {
          summary: 's',
          careerGoal: 'Old Goal',
          targetIndustry: 'Old Industry',
          background: 'Ops',
          motivation: 'Grow',
          learningStyle: 'l',
          weeklyTimeCommitment: 't',
          certificatePreference: 'c',
          skills: ['SQL'],
        },
        careerMatches: [{ id: 'career-1', title: 'Data Analyst' }],
        selectedCareerId: 'career-1',
        pathwayCourses: [{
          id: 'course-1', courseKey: 'course-1', title: 'Intro to SQL', status: 'not_started',
        }],
        pathwayBaseline: {
          careerGoal: 'Old Goal', targetIndustry: 'Old Industry', background: 'Ops', motivation: 'Grow', selectedCareerId: 'career-1',
        },
        dismissedSkillKeys: ['Python'],
      },
      version: 1,
    }));

    // eslint-disable-next-line global-require
    const { usePathwaysStore } = require('./pathwaysStore');
    const state = usePathwaysStore.getState();

    // The old shape's `section`/`careerMatches`/`selectedCareerId`/`pathwayCourses` keys
    // happen to share their names with the new shape, so those carry over verbatim.
    expect(state.section).toBe('profile');
    expect(state.careerMatches).toEqual([{ id: 'career-1', title: 'Data Analyst' }]);
    expect(state.selectedCareerId).toBe('career-1');
    // But every renamed/removed field resets to a fresh default rather than being
    // migrated — `learnerIntent` is NOT populated from the old `onboarding.answers`,
    // and the old `learnerProfile`'s intent fields are not carried over either.
    expect(state.learnerIntent).toEqual({
      careerGoal: '', targetIndustry: '', background: '', motivation: '',
    });
    // `selectedSkills`/`pathwayInputFingerprint` are conservatively null/stale until
    // the learner rebuilds — never silently treated as valid/unchanged.
    expect(state.selectedSkills).toBeNull();
    expect(state.pathwayInputFingerprint).toBeNull();
  });

  it('persists only the durable subset to localStorage on a state change', () => {
    // eslint-disable-next-line global-require
    const { usePathwaysStore } = require('./pathwaysStore');

    usePathwaysStore.getState().setSection('profile');

    const stored = JSON.parse(localStorage.getItem(PATHWAYS_STORAGE_KEY) as string);
    expect(stored.state.section).toBe('profile');
    expect(stored.state).not.toHaveProperty('loading');
    expect(stored.state).not.toHaveProperty('errors');
  });

  it('serializes a full round-trip: write, then hydrate a fresh store instance from it', () => {
    // eslint-disable-next-line global-require
    const first = require('./pathwaysStore').usePathwaysStore;
    first.getState().commitProfileSuccess({
      learnerIntent: {
        careerGoal: 'Data Analyst', targetIndustry: 'Tech', background: 'b', motivation: 'm',
      },
      learnerProfile: {
        summary: 's', learningStyle: 'l', weeklyTimeCommitment: 't', certificatePreference: 'c', skills: ['SQL'],
      },
      careerMatches: [{ id: 'career-1', title: 'Data Analyst' }],
    });

    jest.resetModules();
    // eslint-disable-next-line global-require
    const second = require('./pathwaysStore').usePathwaysStore;

    expect(second.getState().learnerIntent.careerGoal).toBe('Data Analyst');
    expect(second.getState().selectedCareerId).toBe('career-1');
  });

  it('restores initial state after localStorage is cleared externally', () => {
    localStorage.setItem(PATHWAYS_STORAGE_KEY, JSON.stringify({
      state: { section: 'profile', careerMatches: [{ id: 'career-1', title: 'Data Analyst' }] },
      version: PATHWAYS_STORAGE_VERSION,
    }));
    // eslint-disable-next-line global-require
    const before = require('./pathwaysStore').usePathwaysStore;
    expect(before.getState().section).toBe('profile');

    localStorage.clear();
    jest.resetModules();
    // eslint-disable-next-line global-require
    const after = require('./pathwaysStore').usePathwaysStore;

    expect(after.getState().section).toBe('onboarding');
    expect(after.getState().learnerProfile).toBeNull();
  });
});
