import {
  generatePathwayWorkflow,
  generateProfileWorkflow,
} from './index';

const stubProfile = {
  summary: 's',
  careerGoal: 'Data Analyst',
  targetIndustry: 'Tech',
  background: 'Ops',
  motivation: 'career growth',
  learningStyle: 'Hands-on',
  weeklyTimeCommitment: '5 hours',
  certificatePreference: 'Preferred',
  skills: [] as string[],
};

describe('pathways workflows scaffolds', () => {
  it('resolves profile workflow with the given profile echoed back, plus stub career matches', async () => {
    const result = await generateProfileWorkflow({ learnerProfile: stubProfile });

    expect(result.learnerProfile).toEqual(stubProfile);
    expect(result.careerMatches.length).toBeGreaterThan(0);
  });

  it('resolves pathway workflow without payload', async () => {
    await expect(generatePathwayWorkflow()).resolves.toBeUndefined();
  });

  it('resolves pathway workflow with payload', async () => {
    await expect(generatePathwayWorkflow({
      payload: { selectedCareerId: 'career-1' },
    })).resolves.toBeUndefined();
  });
});
