import {
  CAREER_SELECTION_STUB_PROFILE,
  buildCareerSelectionStubProfile,
} from '../fixtures';

describe('buildCareerSelectionStubProfile', () => {
  it('falls back to the stub defaults when no answers are provided', () => {
    const profile = buildCareerSelectionStubProfile({});
    expect(profile).toEqual(CAREER_SELECTION_STUB_PROFILE);
  });

  it('falls back to the stub defaults when answers are whitespace-only', () => {
    const profile = buildCareerSelectionStubProfile({
      goal: '   ',
      industry: '  ',
      background: '',
      motivation: '   ',
    });
    expect(profile.careerGoal).toBe(CAREER_SELECTION_STUB_PROFILE.careerGoal);
    expect(profile.targetIndustry).toBe(CAREER_SELECTION_STUB_PROFILE.targetIndustry);
    expect(profile.background).toBe(CAREER_SELECTION_STUB_PROFILE.background);
    expect(profile.motivation).toBe(CAREER_SELECTION_STUB_PROFILE.motivation);
  });

  it('overrides fields with trimmed answers when provided', () => {
    const profile = buildCareerSelectionStubProfile({
      goal: '  Director of Analytics  ',
      industry: '  Healthcare  ',
      background: '  Product manager for 6 years.  ',
      motivation: '  Move into leadership.  ',
    });
    expect(profile.careerGoal).toBe('Director of Analytics');
    expect(profile.targetIndustry).toBe('Healthcare');
    expect(profile.background).toBe('Product manager for 6 years.');
    expect(profile.motivation).toBe('Move into leadership.');
  });

  it('leaves fields not derived from answers untouched', () => {
    const profile = buildCareerSelectionStubProfile({ goal: 'Director of Analytics' });
    expect(profile.skills).toEqual(CAREER_SELECTION_STUB_PROFILE.skills);
    expect(profile.summary).toBe(CAREER_SELECTION_STUB_PROFILE.summary);
    expect(profile.learningStyle).toBe(CAREER_SELECTION_STUB_PROFILE.learningStyle);
  });
});
