import { OpenAIPathwaysService } from '../services/pathways.service';
import { MOCK_LEARNER_PROFILE, MOCK_PATHWAY } from '../services/pathways.stub';

describe('AI Pathways Service Layer', () => {
  let service: OpenAIPathwaysService;

  beforeEach(() => {
    // Service initialized without API key defaults to stub on error
    service = new OpenAIPathwaysService('');
  });

  test('createLearnerProfile falls back to stub when API key is missing', async () => {
    const args = {
      bringsYouHereRes: 'test',
      careerGoalRes: 'test',
      learningPrefRes: 'test',
      backgroundRes: 'test',
      industryRes: 'test',
      timeAvailableRes: 'test',
      certificateRes: 'test',
    };

    const profile = await service.createLearnerProfile(args);
    expect(profile).toEqual(MOCK_LEARNER_PROFILE);
  });

  test('createLearningPathway falls back to stub when API key is missing', async () => {
    const careerGoal = MOCK_LEARNER_PROFILE.careerMatches[0];
    const pathway = await service.createLearningPathway(careerGoal, MOCK_LEARNER_PROFILE);
    expect(pathway).toEqual(MOCK_PATHWAY);
  });
});
