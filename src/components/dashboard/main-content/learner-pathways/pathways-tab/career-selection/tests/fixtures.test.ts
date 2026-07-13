import { CAREER_SELECTION_STUB_MATCHES, CAREER_SELECTION_STUB_PROFILE } from '../fixtures';

describe('CAREER_SELECTION_STUB_PROFILE', () => {
  it('contains only generated-profile fields, no intent fields', () => {
    expect(CAREER_SELECTION_STUB_PROFILE).not.toHaveProperty('careerGoal');
    expect(CAREER_SELECTION_STUB_PROFILE).not.toHaveProperty('targetIndustry');
    expect(CAREER_SELECTION_STUB_PROFILE).not.toHaveProperty('background');
    expect(CAREER_SELECTION_STUB_PROFILE).not.toHaveProperty('motivation');
    expect(CAREER_SELECTION_STUB_PROFILE.summary).toBeTruthy();
    expect(CAREER_SELECTION_STUB_PROFILE.skills.length).toBeGreaterThan(0);
  });
});

describe('CAREER_SELECTION_STUB_MATCHES', () => {
  it('provides at least one career match with recommended skills', () => {
    expect(CAREER_SELECTION_STUB_MATCHES.length).toBeGreaterThan(0);
    expect(CAREER_SELECTION_STUB_MATCHES[0].skillsToDevelop?.length).toBeGreaterThan(0);
  });
});
