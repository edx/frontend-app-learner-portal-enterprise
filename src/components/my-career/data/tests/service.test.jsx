import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { getAuthenticatedHttpClient } from '@edx/frontend-platform/auth';

import { patchProfile, fetchJobDetailsFromAlgolia } from '../service';
import { fetchLearnerSkillLevels } from '../../../app/data';
import { CURRENT_JOB_PROFILE_FIELD_NAME } from '../constants';

// config
const APP_CONFIG = {
  DISCOVERY_API_BASE_URL: 'http://localhost:18381',
  LMS_BASE_URL: 'http://localhost:18000',
};

jest.mock('@edx/frontend-platform', () => ({
  ...jest.requireActual('@edx/frontend-platform'),
  getConfig: () => (APP_CONFIG),
}));

// test data
const JOB_ID = 27;
const USERNAME = 'Bob';

// endpoints
const LEARNER_SKILL_LEVELS_ENDPOINT = `${APP_CONFIG.LMS_BASE_URL}/api/user/v1/skill_level/${JOB_ID}/`;
const LEARNER_PROFILE_ENDPOINT = `${APP_CONFIG.LMS_BASE_URL}/api/user/v1/accounts/${USERNAME}`;

// mocks
jest.mock('@edx/frontend-platform/auth');
const axiosMock = new MockAdapter(axios);
getAuthenticatedHttpClient.mockReturnValue(axios);
axiosMock.onAny().reply(200);
axios.get = jest.fn().mockImplementation(() => Promise.resolve({}));
axios.patch = jest.fn().mockImplementation(() => Promise.resolve({}));

jest.mock('@edx/frontend-platform/logging', () => ({
  logError: jest.fn(),
}));

describe('my career services', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    axiosMock.resetHistory();
  });

  it('fetches enterprise learner skill levels', async () => {
    await fetchLearnerSkillLevels(JOB_ID);
    expect(axios.get).toHaveBeenCalledWith(LEARNER_SKILL_LEVELS_ENDPOINT);
  });

  it('patches enterprise learner profile info', async () => {
    const params = {
      extended_profile: [
        { field_name: CURRENT_JOB_PROFILE_FIELD_NAME, field_value: JOB_ID },
      ],
    };
    const header = {
      headers: { 'Content-Type': 'application/merge-patch+json' },
    };
    await patchProfile(USERNAME, params);
    expect(axios.patch).toHaveBeenCalledWith(LEARNER_PROFILE_ENDPOINT, params, header);
  });

  describe('fetchJobDetailsFromAlgolia', () => {
    const mockSearchIndex = { search: jest.fn() };

    beforeEach(() => {
      mockSearchIndex.search.mockResolvedValue({ hits: [{ id: 27, name: 'Software Engineer' }] });
    });

    it('searches by job name only when no languages provided', async () => {
      await fetchJobDetailsFromAlgolia(mockSearchIndex, 'Software Engineer');
      expect(mockSearchIndex.search).toHaveBeenCalledWith('', {
        filters: 'name:"Software Engineer"',
        facetFilters: [],
      });
    });

    it('includes metadata_language facetFilters when languages are provided', async () => {
      await fetchJobDetailsFromAlgolia(mockSearchIndex, 'Software Engineer', ['en', 'es']);
      expect(mockSearchIndex.search).toHaveBeenCalledWith('', {
        filters: 'name:"Software Engineer"',
        facetFilters: [['metadata_language:en', 'metadata_language:es']],
      });
    });

    it('escapes quotes and backslashes in job name filter', async () => {
      await fetchJobDetailsFromAlgolia(mockSearchIndex, 'Developer "C\\C++"');
      expect(mockSearchIndex.search).toHaveBeenCalledWith('', {
        filters: 'name:"Developer \\"C\\\\C++\\""',
        facetFilters: [],
      });
    });

    it('returns the first hit', async () => {
      const result = await fetchJobDetailsFromAlgolia(mockSearchIndex, 'Software Engineer');
      expect(result).toEqual({ id: 27, name: 'Software Engineer' });
    });
  });
});
