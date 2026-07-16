import {
  generatePathwayWorkflow,
  generateProfileWorkflow,
} from './index';

const stubLearnerIntent = {
  careerGoal: 'Data Analyst', targetIndustry: 'Tech', background: 'Ops', motivation: 'career growth',
};

const stubLearnerProfile = {
  summary: 's', learningStyle: 'Hands-on', weeklyTimeCommitment: '5 hours', certificatePreference: 'Preferred', skills: [] as string[],
};

describe('pathways workflows scaffolds', () => {
  it('resolves profile workflow with a stub-generated profile (no intent fields) plus stub career matches', async () => {
    const result = await generateProfileWorkflow(stubLearnerIntent);

    expect(result.learnerProfile).not.toHaveProperty('careerGoal');
    expect(result.learnerProfile.summary).toBeTruthy();
    expect(result.careerMatches.length).toBeGreaterThan(0);
  });

  it('resolves pathway workflow with the stub course set, each course carrying a courseKey', async () => {
    const result = await generatePathwayWorkflow({
      learnerIntent: stubLearnerIntent,
      learnerProfile: stubLearnerProfile,
      selectedCareerId: 'career-1',
      selectedSkills: ['SQL'],
    });

    expect(result.courses.length).toBeGreaterThan(0);
    result.courses.forEach((course) => {
      expect(course.courseKey).toBeTruthy();
    });
  });
});
