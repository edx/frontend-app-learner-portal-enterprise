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
        onboarding: {
          answers: {
            motivation: 'Grow', goal: '', background: '', industry: '',
          },
          currentQuestion: 0,
          isComplete: false,
        },
      },
      version: PATHWAYS_STORAGE_VERSION,
    }));

    // eslint-disable-next-line global-require
    const { usePathwaysStore } = require('./pathwaysStore');

    expect(usePathwaysStore.getState().onboarding.answers.motivation).toBe('Grow');
    expect(usePathwaysStore.getState().pathwayBaseline).toBeNull();
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

  it('persists only the durable subset to localStorage on a state change', () => {
    // eslint-disable-next-line global-require
    const { usePathwaysStore } = require('./pathwaysStore');

    usePathwaysStore.getState().setSection('profile');
    usePathwaysStore.getState().setLoading('learnerProfile', true);

    const stored = JSON.parse(localStorage.getItem(PATHWAYS_STORAGE_KEY) as string);
    expect(stored.state.section).toBe('profile');
    expect(stored.state).not.toHaveProperty('loading');
    expect(stored.state).not.toHaveProperty('errors');
    expect(stored.state).not.toHaveProperty('constructedPayloads');
    expect(stored.state).not.toHaveProperty('progress');
  });

  it('serializes a full round-trip: write, then hydrate a fresh store instance from it', () => {
    // eslint-disable-next-line global-require
    const first = require('./pathwaysStore').usePathwaysStore;
    first.getState().setLearnerProfile({
      summary: 's',
      careerGoal: 'Data Analyst',
      targetIndustry: 'Tech',
      background: 'b',
      motivation: 'm',
      learningStyle: 'l',
      weeklyTimeCommitment: 't',
      certificatePreference: 'c',
      skills: ['SQL'],
    });
    first.getState().setCareerMatches([{ id: 'career-1', title: 'Data Analyst' }]);
    first.getState().setSelectedCareerId('career-1');

    jest.resetModules();
    // eslint-disable-next-line global-require
    const second = require('./pathwaysStore').usePathwaysStore;

    expect(second.getState().learnerProfile?.careerGoal).toBe('Data Analyst');
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
