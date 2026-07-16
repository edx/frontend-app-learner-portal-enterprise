import { getCareerActionState, isPathwayEdited } from '../careerActionState';
import { computePathwayInputFingerprint } from '../../state';
import type { PathwayGenerationRequest } from '../../state';

const request: PathwayGenerationRequest = {
  learnerIntent: {
    careerGoal: 'Data Analyst', targetIndustry: 'Technology', background: 'Operations', motivation: 'Career growth',
  },
  learnerProfile: {
    summary: 's', learningStyle: 'l', weeklyTimeCommitment: 't', certificatePreference: 'c', skills: ['SQL'],
  },
  selectedCareerId: 'career-1',
  selectedSkills: ['SQL'],
};

describe('isPathwayEdited', () => {
  it('is edited when there is no stored fingerprint (conservative default)', () => {
    expect(isPathwayEdited(null, request)).toBe(true);
  });

  it('is not edited when the current request fingerprints identically to the stored one', () => {
    expect(isPathwayEdited(computePathwayInputFingerprint(request), request)).toBe(false);
  });

  it('is edited when the selected career differs from the one that produced the stored fingerprint', () => {
    const storedFingerprint = computePathwayInputFingerprint(request);
    const current = { ...request, selectedCareerId: 'career-2' };
    expect(isPathwayEdited(storedFingerprint, current)).toBe(true);
  });

  it('is edited when a learner intent field differs from the one that produced the stored fingerprint', () => {
    const storedFingerprint = computePathwayInputFingerprint(request);
    const current = { ...request, learnerIntent: { ...request.learnerIntent, careerGoal: 'Product Manager' } };
    expect(isPathwayEdited(storedFingerprint, current)).toBe(true);
  });

  it('is edited when selectedSkills differs from the one that produced the stored fingerprint', () => {
    const storedFingerprint = computePathwayInputFingerprint(request);
    const current = { ...request, selectedSkills: [] };
    expect(isPathwayEdited(storedFingerprint, current)).toBe(true);
  });

  it('is not edited when only selectedSkills order differs', () => {
    const storedFingerprint = computePathwayInputFingerprint(request);
    const current = { ...request, selectedSkills: [...request.selectedSkills].reverse() };
    expect(isPathwayEdited(storedFingerprint, current)).toBe(false);
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
