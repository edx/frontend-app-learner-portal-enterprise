import MockAdapter from 'axios-mock-adapter';
import axios from 'axios';
import { getAuthenticatedHttpClient } from '@edx/frontend-platform/auth';
import { camelCaseObject, snakeCaseObject } from '@edx/frontend-platform/utils';

import { fetchLearningIntent } from './xpert';

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
    interestedIndustries: 'Technology, Healthcare',
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
    expect(JSON.parse(axiosMock.history.post[0].data)).toEqual(snakeCaseObject(mockRequest));
  });

  it('sends interestedIndustries unchanged as interested_industries', async () => {
    axiosMock.onPost(LEARNING_INTENT_URL).reply(200, mockResponseRaw);
    await fetchLearningIntent(mockRequest);
    expect(JSON.parse(axiosMock.history.post[0].data).interested_industries)
      .toEqual(mockRequest.interestedIndustries);
  });

  it('maps the response to the typed camelCase contract', async () => {
    axiosMock.onPost(LEARNING_INTENT_URL).reply(200, mockResponseRaw);
    const result = await fetchLearningIntent(mockRequest);
    expect(result).toEqual(camelCaseObject(mockResponseRaw));
  });

  it('rejects when the HTTP client rejects', async () => {
    axiosMock.onPost(LEARNING_INTENT_URL).reply(500);
    await expect(fetchLearningIntent(mockRequest)).rejects.toThrow();
  });
});
