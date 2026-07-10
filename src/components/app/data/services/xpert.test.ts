import MockAdapter from 'axios-mock-adapter';
import axios from 'axios';
import { getAuthenticatedHttpClient } from '@edx/frontend-platform/auth';

import { fetchLearningIntent, fetchRecommendationFeedback } from './xpert';

const axiosMock = new MockAdapter(axios);
getAuthenticatedHttpClient.mockReturnValue(axios);

const APP_CONFIG = {
  ENTERPRISE_ACCESS_BASE_URL: 'http://localhost:18270',
};

jest.mock('@edx/frontend-platform/config', () => ({
  ...jest.requireActual('@edx/frontend-platform/config'),
  getConfig: jest.fn(() => APP_CONFIG),
}));
jest.mock('@edx/frontend-platform/auth', () => ({
  ...jest.requireActual('@edx/frontend-platform/auth'),
  getAuthenticatedHttpClient: jest.fn(),
}));

const LEARNING_INTENT_URL = `${APP_CONFIG.ENTERPRISE_ACCESS_BASE_URL}/api/v1/learner-pathways/learning-intent/`;

describe('fetchLearningIntent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    axiosMock.reset();
  });

  const mockRequest = {
    selectedGoals: 'Become a data analyst',
    freeText: 'I want to learn data analysis to switch careers.',
    knownContext: '5 years of accounting experience',
  };

  const mockResponseRaw = {
    skills_required: ['SQL', 'Python'],
    skills_preferred: ['Data Visualization'],
    condensed_algolia_query: 'data analysis python sql',
  };

  it('uses the authenticated HTTP client to post to the exact Learning Intent URL, matching the DRF router\'s registered route', async () => {
    axiosMock.onPost(LEARNING_INTENT_URL).reply(200, mockResponseRaw);
    await fetchLearningIntent(mockRequest);
    expect(getAuthenticatedHttpClient).toHaveBeenCalled();
    expect(axiosMock.history.post[0].url).toEqual(LEARNING_INTENT_URL);
  });

  it('sends the exact serializer-compatible payload', async () => {
    axiosMock.onPost(LEARNING_INTENT_URL).reply(200, mockResponseRaw);
    await fetchLearningIntent(mockRequest);
    expect(JSON.parse(axiosMock.history.post[0].data)).toEqual({
      selected_goals: mockRequest.selectedGoals,
      free_text: mockRequest.freeText,
      known_context: mockRequest.knownContext,
    });
  });

  it('maps the response to the typed camelCase contract', async () => {
    axiosMock.onPost(LEARNING_INTENT_URL).reply(200, mockResponseRaw);
    const result = await fetchLearningIntent(mockRequest);
    expect(result).toEqual({
      skillsRequired: mockResponseRaw.skills_required,
      skillsPreferred: mockResponseRaw.skills_preferred,
      condensedAlgoliaQuery: mockResponseRaw.condensed_algolia_query,
    });
  });

  it('rejects when the HTTP client rejects', async () => {
    axiosMock.onPost(LEARNING_INTENT_URL).reply(500);
    await expect(fetchLearningIntent(mockRequest)).rejects.toThrow();
  });
});

const RECOMMENDATION_FEEDBACK_URL = `${APP_CONFIG.ENTERPRISE_ACCESS_BASE_URL}/api/v1/learner-pathways/recommendation-feedback`;

describe('fetchRecommendationFeedback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    axiosMock.reset();
  });

  const mockCourseKey = 'course-v1:edX+ExampleX+1T2026';

  const mockRequest = {
    selectedCareer: 'Data Analyst',
    courseKeys: [mockCourseKey, 'course-v1:edX+OtherX+2T2026'],
    learnerProfile: {
      careerGoal: 'Become a data analyst',
      background: 'Accounting',
      nestedMixedCaseKey: { keepAsIs: true },
    },
  };

  const mockResponseRaw = {
    reasons: {
      [mockCourseKey]: 'Matches your target skill in SQL.',
      'course-v1:edX+OtherX+2T2026': 'Matches your target skill in Python.',
    },
  };

  it('uses the authenticated HTTP client to post to the exact Recommendation Feedback URL without a trailing slash', async () => {
    axiosMock.onPost(RECOMMENDATION_FEEDBACK_URL).reply(200, mockResponseRaw);
    await fetchRecommendationFeedback(mockRequest);
    expect(getAuthenticatedHttpClient).toHaveBeenCalled();
    expect(axiosMock.history.post[0].url).toEqual(RECOMMENDATION_FEEDBACK_URL);
  });

  it('sends the exact serializer-compatible payload with course keys in supplied order', async () => {
    axiosMock.onPost(RECOMMENDATION_FEEDBACK_URL).reply(200, mockResponseRaw);
    await fetchRecommendationFeedback(mockRequest);
    expect(JSON.parse(axiosMock.history.post[0].data)).toEqual({
      selected_career: mockRequest.selectedCareer,
      course_keys: mockRequest.courseKeys,
      learner_profile: mockRequest.learnerProfile,
    });
  });

  it('preserves the learner-profile payload unchanged', async () => {
    axiosMock.onPost(RECOMMENDATION_FEEDBACK_URL).reply(200, mockResponseRaw);
    await fetchRecommendationFeedback(mockRequest);
    const sentPayload = JSON.parse(axiosMock.history.post[0].data);
    expect(sentPayload.learner_profile).toEqual(mockRequest.learnerProfile);
  });

  it('preserves dynamic reason keys exactly, including a realistic catalog course key', async () => {
    axiosMock.onPost(RECOMMENDATION_FEEDBACK_URL).reply(200, mockResponseRaw);
    const result = await fetchRecommendationFeedback(mockRequest);
    expect(result.reasons[mockCourseKey]).toEqual(mockResponseRaw.reasons[mockCourseKey]);
    expect(result).toEqual({ reasons: mockResponseRaw.reasons });
  });

  it('rejects when the HTTP client rejects', async () => {
    axiosMock.onPost(RECOMMENDATION_FEEDBACK_URL).reply(500);
    await expect(fetchRecommendationFeedback(mockRequest)).rejects.toThrow();
  });
});
