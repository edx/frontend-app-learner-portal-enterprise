import {
  normalizePathwaysState,
  normalizeSelectedCareerId,
  orderDisplayableCareerMatches,
  recommendedSkillsForCareer,
} from './normalize';
import { getInitialPathwaysState } from './pathwaysStore';
import type { CareerMatch, PathwaysState } from './types';

const matches: CareerMatch[] = [
  { id: 'career-1', title: 'Data Analyst', skillsToDevelop: ['SQL', 'SQL', ' Python ', ''] },
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

describe('recommendedSkillsForCareer', () => {
  it('trims and dedupes the matched career skills list', () => {
    expect(recommendedSkillsForCareer(matches, 'career-1')).toEqual(['SQL', 'Python']);
  });

  it('returns an empty array for a match with no skillsToDevelop', () => {
    expect(recommendedSkillsForCareer(matches, 'career-2')).toEqual([]);
  });

  it('returns null when the candidate id does not reference a current match', () => {
    expect(recommendedSkillsForCareer(matches, 'stale-id')).toBeNull();
    expect(recommendedSkillsForCareer(matches, null)).toBeNull();
  });
});

describe('orderDisplayableCareerMatches', () => {
  it('excludes a career with no associated skills', () => {
    const withSkillless: CareerMatch[] = [
      { id: 'no-skills', title: 'No Skills Role', matchPercentage: 90 },
      {
        id: 'has-skills', title: 'Has Skills Role', matchPercentage: 50, skillsToDevelop: ['SQL'],
      },
    ];
    expect(orderDisplayableCareerMatches(withSkillless).map((m) => m.id)).toEqual(['has-skills']);
  });

  it('excludes a career below the minimum visible match threshold', () => {
    const belowThreshold: CareerMatch[] = [
      {
        id: 'weak', title: 'Weak Role', matchPercentage: 20, skillsToDevelop: ['SQL'],
      },
      {
        id: 'strong', title: 'Strong Role', matchPercentage: 80, skillsToDevelop: ['SQL'],
      },
    ];
    expect(orderDisplayableCareerMatches(belowThreshold).map((m) => m.id)).toEqual(['strong']);
  });

  it('sorts by match percentage descending, regardless of input order', () => {
    const outOfOrder: CareerMatch[] = [
      {
        id: 'mid', title: 'Mid', matchPercentage: 60, skillsToDevelop: ['SQL'],
      },
      {
        id: 'top', title: 'Top', matchPercentage: 95, skillsToDevelop: ['SQL'],
      },
      {
        id: 'low', title: 'Low', matchPercentage: 30, skillsToDevelop: ['SQL'],
      },
    ];
    expect(orderDisplayableCareerMatches(outOfOrder).map((m) => m.id)).toEqual(['top', 'mid', 'low']);
  });

  it('does not mutate the input array', () => {
    const outOfOrder: CareerMatch[] = [
      {
        id: 'mid', title: 'Mid', matchPercentage: 60, skillsToDevelop: ['SQL'],
      },
      {
        id: 'top', title: 'Top', matchPercentage: 95, skillsToDevelop: ['SQL'],
      },
    ];
    const snapshot = [...outOfOrder];
    orderDisplayableCareerMatches(outOfOrder);
    expect(outOfOrder).toEqual(snapshot);
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
      selectedSkills: ['SQL'],
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

  it('demotes section "profile" back to "onboarding" when intake was never completed (empty learnerIntent)', () => {
    const state: PathwaysState = {
      ...baseState(),
      section: 'profile',
      learnerProfile: null,
      careerMatches: [],
    };
    expect(normalizePathwaysState(state).section).toBe('onboarding');
  });

  it('does not demote section "profile" to "onboarding" when intake was completed, even with no profile/matches/pathway yet', () => {
    const state: PathwaysState = {
      ...baseState(),
      section: 'profile',
      learnerIntent: {
        careerGoal: 'Senior Data Analyst',
        targetIndustry: 'EdTech',
        background: 'Data analyst with 5 years experience',
        motivation: 'Upskill for promotion',
      },
      learnerProfile: null,
      careerMatches: [],
      selectedCareerId: null,
      pathwayCourses: [],
    };
    expect(normalizePathwaysState(state).section).toBe('profile');
  });

  it('does not demote section "profile" to "onboarding" when a pathway already exists (State A build)', () => {
    const state: PathwaysState = {
      ...baseState(),
      section: 'profile',
      learnerProfile: null,
      careerMatches: [],
      selectedCareerId: 'career-1',
      pathwayCourses: [{ courseKey: 'course-1', title: 'Intro to SQL', status: 'not_started' }],
    };
    expect(normalizePathwaysState(state).section).toBe('profile');
  });

  it('preserves selectedCareerId, selectedSkills, and the fingerprint on hydration for a State A pathway (section "pathway")', () => {
    const state: PathwaysState = {
      ...baseState(),
      section: 'pathway',
      learnerProfile: null,
      careerMatches: [],
      selectedCareerId: 'reporting-data-analysis-manager',
      selectedSkills: ['SQL', 'Data Analysis'],
      pathwayCourses: [{ courseKey: 'course-1', title: 'Intro to SQL', status: 'not_started' }],
      pathwayInputFingerprint: 'fingerprint-1',
    };
    const normalized = normalizePathwaysState(state);
    expect(normalized.section).toBe('pathway');
    expect(normalized.selectedCareerId).toBe('reporting-data-analysis-manager');
    expect(normalized.selectedSkills).toEqual(['SQL', 'Data Analysis']);
    expect(normalized.pathwayInputFingerprint).toBe('fingerprint-1');
  });

  it('preserves selectedCareerId and selectedSkills on hydration for a State A pathway (section "profile")', () => {
    const state: PathwaysState = {
      ...baseState(),
      section: 'profile',
      learnerProfile: null,
      careerMatches: [],
      selectedCareerId: 'reporting-data-analysis-manager',
      selectedSkills: ['SQL'],
      pathwayCourses: [{ courseKey: 'course-1', title: 'Intro to SQL', status: 'not_started' }],
    };
    const normalized = normalizePathwaysState(state);
    expect(normalized.section).toBe('profile');
    expect(normalized.selectedCareerId).toBe('reporting-data-analysis-manager');
    expect(normalized.selectedSkills).toEqual(['SQL']);
  });

  it('falls back to the true top-match career on hydration, not the raw-first one, when they diverge', () => {
    const outOfOrder: CareerMatch[] = [
      {
        id: 'raw-first', title: 'Raw First', matchPercentage: 40, skillsToDevelop: ['SQL'],
      },
      {
        id: 'top-match', title: 'Top Match', matchPercentage: 90, skillsToDevelop: ['Python'],
      },
    ];
    const state: PathwaysState = {
      ...baseState(),
      careerMatches: outOfOrder,
      selectedCareerId: null,
    };
    expect(normalizePathwaysState(state).selectedCareerId).toBe('top-match');
  });

  it('normalizes a selected career id that no longer references a current match', () => {
    const state: PathwaysState = {
      ...baseState(),
      careerMatches: matches,
      selectedCareerId: 'stale-id',
    };
    expect(normalizePathwaysState(state).selectedCareerId).toBe('career-1');
  });

  it('still falls back to the first match when careerMatches are real but the persisted id is stale, even with an existing pathway', () => {
    const state: PathwaysState = {
      ...baseState(),
      careerMatches: matches,
      selectedCareerId: 'stale-id',
      pathwayCourses: [{ courseKey: 'course-1', title: 'Intro to SQL', status: 'not_started' }],
    };
    expect(normalizePathwaysState(state).selectedCareerId).toBe('career-1');
  });

  it('leaves selectedCareerId null when there are no real matches and nothing was ever selected', () => {
    const state: PathwaysState = {
      ...baseState(),
      careerMatches: [],
      selectedCareerId: null,
    };
    expect(normalizePathwaysState(state).selectedCareerId).toBeNull();
  });

  it('leaves selectedSkills null when selectedCareerId is already null, even with no real matches', () => {
    const state: PathwaysState = {
      ...baseState(),
      careerMatches: [],
      selectedCareerId: null,
      selectedSkills: ['SQL'],
    };
    const normalized = normalizePathwaysState(state);
    expect(normalized.selectedCareerId).toBeNull();
    expect(normalized.selectedSkills).toBeNull();
  });

  it('clears an incomplete generated fingerprint when there is no persisted pathway', () => {
    const state: PathwaysState = {
      ...baseState(),
      pathwayCourses: [],
      pathwayInputFingerprint: 'stale-fingerprint',
    };
    expect(normalizePathwaysState(state).pathwayInputFingerprint).toBeNull();
  });

  it('keeps a fingerprint when a pathway is present', () => {
    const state: PathwaysState = {
      ...baseState(),
      pathwayCourses: [{ courseKey: 'course-1', title: 'Intro to SQL', status: 'not_started' }],
      pathwayInputFingerprint: 'fingerprint-1',
    };
    expect(normalizePathwaysState(state).pathwayInputFingerprint).toBe('fingerprint-1');
  });
});
