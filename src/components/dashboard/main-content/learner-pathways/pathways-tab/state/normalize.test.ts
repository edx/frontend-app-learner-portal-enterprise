import { normalizePathwaysState, normalizeSelectedCareerId } from './normalize';
import { getInitialPathwaysState } from './pathwaysStore';
import type { CareerMatch, PathwaysState } from './types';

const matches: CareerMatch[] = [
  { id: 'career-1', title: 'Data Analyst' },
  { id: 'career-2', title: 'Business Analyst' },
];

describe('normalizeSelectedCareerId', () => {
  it('keeps a candidate id that references a current match', () => {
    expect(normalizeSelectedCareerId(matches, 'career-2')).toBe('career-2');
  });

  it('falls back to the first match when the candidate id is stale', () => {
    expect(normalizeSelectedCareerId(matches, 'stale-id')).toBe('career-1');
  });

  it('falls back to the first match when the candidate is null', () => {
    expect(normalizeSelectedCareerId(matches, null)).toBe('career-1');
  });

  it('falls back to null when there are no matches at all', () => {
    expect(normalizeSelectedCareerId([], 'career-1')).toBeNull();
  });
});

describe('normalizePathwaysState', () => {
  const baseState = (): PathwaysState => getInitialPathwaysState();

  it('leaves a valid state untouched', () => {
    const state: PathwaysState = {
      ...baseState(),
      section: 'profile',
      careerMatches: matches,
      selectedCareerId: 'career-1',
    };
    expect(normalizePathwaysState(state)).toEqual(state);
  });

  it('demotes section "pathway" back to "profile" when there is no persisted pathway', () => {
    const state: PathwaysState = {
      ...baseState(),
      section: 'pathway',
      careerMatches: matches,
      pathwayCourses: [],
    };
    expect(normalizePathwaysState(state).section).toBe('profile');
  });

  it('cascades section "pathway" all the way back to "onboarding" when neither a pathway nor a usable profile exists', () => {
    const state: PathwaysState = {
      ...baseState(),
      section: 'pathway',
      careerMatches: [],
      learnerProfile: null,
      pathwayCourses: [],
    };
    expect(normalizePathwaysState(state).section).toBe('onboarding');
  });

  it('demotes section "profile" back to "onboarding" when there is no usable profile or matches', () => {
    const state: PathwaysState = {
      ...baseState(),
      section: 'profile',
      learnerProfile: null,
      careerMatches: [],
    };
    expect(normalizePathwaysState(state).section).toBe('onboarding');
  });

  it('normalizes a selected career id that no longer references a current match', () => {
    const state: PathwaysState = {
      ...baseState(),
      careerMatches: matches,
      selectedCareerId: 'stale-id',
    };
    expect(normalizePathwaysState(state).selectedCareerId).toBe('career-1');
  });

  it('clears an incomplete generated baseline when there is no persisted pathway', () => {
    const state: PathwaysState = {
      ...baseState(),
      pathwayCourses: [],
      pathwayBaseline: {
        careerGoal: 'Data Analyst',
        targetIndustry: 'Tech',
        background: 'Ops',
        motivation: 'Growth',
        selectedCareerId: 'career-1',
      },
    };
    expect(normalizePathwaysState(state).pathwayBaseline).toBeNull();
  });

  it('keeps a baseline when a pathway is present', () => {
    const baseline = {
      careerGoal: 'Data Analyst',
      targetIndustry: 'Tech',
      background: 'Ops',
      motivation: 'Growth',
      selectedCareerId: 'career-1',
    };
    const state: PathwaysState = {
      ...baseState(),
      pathwayCourses: [{ id: 'course-1', title: 'Intro to SQL', status: 'not_started' }],
      pathwayBaseline: baseline,
    };
    expect(normalizePathwaysState(state).pathwayBaseline).toEqual(baseline);
  });
});
