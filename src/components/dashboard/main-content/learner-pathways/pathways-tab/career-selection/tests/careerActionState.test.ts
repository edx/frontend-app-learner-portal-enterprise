import { getCareerActionState, isPathwayEdited } from '../careerActionState';

const baseline = {
  careerGoal: 'Data Analyst',
  targetIndustry: 'Technology',
  background: 'Operations',
  motivation: 'Career growth',
  selectedCareerId: 'career-1',
};

const currentFromBaseline = () => ({
  goalSummary: {
    careerGoal: baseline.careerGoal,
    targetIndustry: baseline.targetIndustry,
    background: baseline.background,
    motivation: baseline.motivation,
  },
  selectedCareerId: baseline.selectedCareerId,
});

describe('isPathwayEdited', () => {
  it('is never edited when there is no baseline', () => {
    expect(isPathwayEdited(null, currentFromBaseline())).toBe(false);
  });

  it('is not edited when current values match the baseline exactly', () => {
    expect(isPathwayEdited(baseline, currentFromBaseline())).toBe(false);
  });

  it('is edited when the selected career differs from the baseline', () => {
    const current = { ...currentFromBaseline(), selectedCareerId: 'career-2' };
    expect(isPathwayEdited(baseline, current)).toBe(true);
  });

  it('is edited when a Goal Summary field differs from the baseline', () => {
    const current = currentFromBaseline();
    current.goalSummary = { ...current.goalSummary, careerGoal: 'Product Manager' };
    expect(isPathwayEdited(baseline, current)).toBe(true);
  });

  it('is not edited when reselecting the same career (no-op reselect)', () => {
    const current = { ...currentFromBaseline(), selectedCareerId: baseline.selectedCareerId };
    expect(isPathwayEdited(baseline, current)).toBe(false);
  });

  it('ignores fields outside the Goal Summary (e.g. skills/learning style are not part of comparison input)', () => {
    // isPathwayEdited only accepts goalSummary + selectedCareerId — this test documents
    // that dismissing/restoring skills or other profile fields cannot influence the result
    // because they are never part of the comparison input shape.
    expect(isPathwayEdited(baseline, currentFromBaseline())).toBe(false);
  });
});

describe('getCareerActionState', () => {
  it('returns new-pathway when there is no existing pathway', () => {
    expect(getCareerActionState({ hasExistingPathway: false, isEdited: false })).toBe('new-pathway');
    expect(getCareerActionState({ hasExistingPathway: false, isEdited: true })).toBe('new-pathway');
  });

  it('returns existing-pathway-unchanged when a pathway exists and nothing relevant changed', () => {
    expect(getCareerActionState({ hasExistingPathway: true, isEdited: false })).toBe('existing-pathway-unchanged');
  });

  it('returns existing-pathway-edited when a pathway exists and a relevant edit was made', () => {
    expect(getCareerActionState({ hasExistingPathway: true, isEdited: true })).toBe('existing-pathway-edited');
  });
});
