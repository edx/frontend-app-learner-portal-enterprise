import { generatePathwayWorkflow } from './index';

const stubLearnerIntent = {
  careerGoal: 'Data Analyst', targetIndustry: 'Tech', background: 'Ops', motivation: 'career growth',
};

const stubLearnerProfile = {
  summary: 's', learningStyle: 'Hands-on', weeklyTimeCommitment: '5 hours', certificatePreference: 'Preferred', skills: [] as string[],
};

describe('generatePathwayWorkflow scaffold', () => {
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
