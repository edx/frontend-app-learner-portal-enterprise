import algoliasearch from 'algoliasearch';
import { getCareerAlgoliaIndex } from './careerAlgoliaIndex';

jest.mock('algoliasearch', () => jest.fn());

jest.mock('@edx/frontend-platform/config', () => ({
  getConfig: jest.fn(() => ({
    ALGOLIA_APP_ID: 'test-app-id',
    ALGOLIA_SEARCH_API_KEY: 'test-search-key',
    ALGOLIA_INDEX_NAME_JOBS: 'test-jobs-index',
  })),
}));

describe('getCareerAlgoliaIndex', () => {
  const mockInitIndex = jest.fn(() => ({ search: jest.fn() }));

  beforeEach(() => {
    jest.clearAllMocks();
    (algoliasearch as unknown as jest.Mock).mockReturnValue({ initIndex: mockInitIndex });
  });

  it('initializes the Algolia client with the configured app id and search API key', () => {
    getCareerAlgoliaIndex();

    expect(algoliasearch).toHaveBeenCalledWith('test-app-id', 'test-search-key');
  });

  it('resolves the configured jobs/taxonomy index, not a hard-coded name', () => {
    getCareerAlgoliaIndex();

    expect(mockInitIndex).toHaveBeenCalledWith('test-jobs-index');
  });

  it('returns the initialized SearchIndex', () => {
    const index = getCareerAlgoliaIndex();

    expect(index).toEqual(expect.objectContaining({ search: expect.any(Function) }));
  });
});
