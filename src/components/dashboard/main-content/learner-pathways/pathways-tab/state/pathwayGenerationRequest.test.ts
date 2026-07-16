import { computePathwayInputFingerprint } from './pathwayGenerationRequest';
import type { PathwayGenerationRequest } from './pathwayGenerationRequest';

const baseRequest: PathwayGenerationRequest = {
  learnerIntent: {
    careerGoal: 'Data Analyst', targetIndustry: 'Tech', background: 'Ops', motivation: 'Growth',
  },
  learnerProfile: {
    summary: 's', learningStyle: 'Hands-on', weeklyTimeCommitment: '5 hours', certificatePreference: 'Preferred', skills: ['SQL', 'Python'],
  },
  selectedCareerId: 'career-1',
  selectedSkills: ['SQL', 'Python'],
};

describe('computePathwayInputFingerprint', () => {
  it('is deterministic for the same request', () => {
    expect(computePathwayInputFingerprint(baseRequest)).toBe(computePathwayInputFingerprint({ ...baseRequest }));
  });

  it('fingerprints identically when only selectedSkills order differs', () => {
    const reordered: PathwayGenerationRequest = { ...baseRequest, selectedSkills: ['Python', 'SQL'] };
    expect(computePathwayInputFingerprint(baseRequest)).toBe(computePathwayInputFingerprint(reordered));
  });

  it('fingerprints identically when only learnerProfile.skills order differs', () => {
    const reordered: PathwayGenerationRequest = {
      ...baseRequest,
      learnerProfile: { ...baseRequest.learnerProfile, skills: ['Python', 'SQL'] },
    };
    expect(computePathwayInputFingerprint(baseRequest)).toBe(computePathwayInputFingerprint(reordered));
  });

  it('fingerprints differently when a skill is actually added or removed', () => {
    const changed: PathwayGenerationRequest = { ...baseRequest, selectedSkills: ['SQL'] };
    expect(computePathwayInputFingerprint(baseRequest)).not.toBe(computePathwayInputFingerprint(changed));
  });

  it('fingerprints differently when the selected career changes', () => {
    const changed: PathwayGenerationRequest = { ...baseRequest, selectedCareerId: 'career-2' };
    expect(computePathwayInputFingerprint(baseRequest)).not.toBe(computePathwayInputFingerprint(changed));
  });

  it('fingerprints differently when a learner intent field changes', () => {
    const changed: PathwayGenerationRequest = {
      ...baseRequest,
      learnerIntent: { ...baseRequest.learnerIntent, careerGoal: 'Something else' },
    };
    expect(computePathwayInputFingerprint(baseRequest)).not.toBe(computePathwayInputFingerprint(changed));
  });
});
