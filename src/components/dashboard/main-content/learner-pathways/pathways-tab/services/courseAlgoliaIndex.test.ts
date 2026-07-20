import algoliasearch from 'algoliasearch';
import { getCourseAlgoliaIndex } from './courseAlgoliaIndex';

jest.mock('algoliasearch', () => jest.fn());

const mockGetConfig = jest.fn();
jest.mock('@edx/frontend-platform/config', () => ({
  getConfig: () => mockGetConfig(),
}));

const setUrl = (search: string) => {
  window.history.pushState({}, '', `/${search}`);
};

describe('getCourseAlgoliaIndex', () => {
  const mockInitIndex = jest.fn(() => ({ search: jest.fn() }));

  beforeEach(() => {
    jest.clearAllMocks();
    (algoliasearch as unknown as jest.Mock).mockReturnValue({ initIndex: mockInitIndex });
    setUrl('');
    mockGetConfig.mockReturnValue({
      ALGOLIA_APP_ID: 'test-app-id',
      ALGOLIA_SEARCH_API_KEY: 'test-search-key',
      ALGOLIA_INDEX_NAME_V2: 'test-index-v2',
      ALGOLIA_INDEX_NAME: 'test-index-v1',
    });
  });

  afterEach(() => {
    setUrl('');
  });

  it('initializes the Algolia client with the configured app id and search API key', () => {
    getCourseAlgoliaIndex();

    expect(algoliasearch).toHaveBeenCalledWith('test-app-id', 'test-search-key');
  });

  it('prefers ALGOLIA_INDEX_NAME_V2 when set', () => {
    getCourseAlgoliaIndex();

    expect(mockInitIndex).toHaveBeenCalledWith('test-index-v2');
  });

  it('falls back to ALGOLIA_INDEX_NAME when ALGOLIA_INDEX_NAME_V2 is unset', () => {
    mockGetConfig.mockReturnValue({
      ALGOLIA_APP_ID: 'test-app-id',
      ALGOLIA_SEARCH_API_KEY: 'test-search-key',
      ALGOLIA_INDEX_NAME: 'test-index-v1',
    });

    getCourseAlgoliaIndex();

    expect(mockInitIndex).toHaveBeenCalledWith('test-index-v1');
  });

  it('returns the initialized SearchIndex', () => {
    const index = getCourseAlgoliaIndex();

    expect(index).toEqual(expect.objectContaining({ search: expect.any(Function) }));
  });

  describe('debug catalog override', () => {
    beforeEach(() => {
      mockGetConfig.mockReturnValue({
        ALGOLIA_APP_ID: 'test-app-id',
        ALGOLIA_SEARCH_API_KEY: 'test-search-key',
        ALGOLIA_INDEX_NAME_V2: 'test-index-v2',
        ALGOLIA_INDEX_NAME: 'test-index-v1',
        ALGOLIA_STAGE_APP_ID_OVERRIDE: 'stage-app-id',
        ALGOLIA_STAGE_SEARCH_API_KEY_OVERRIDE: 'stage-search-key',
      });
    });

    it('uses the override credentials when ?debug=true and both override keys are configured', () => {
      setUrl('?debug=true');

      getCourseAlgoliaIndex();

      expect(algoliasearch).toHaveBeenCalledWith('stage-app-id', 'stage-search-key');
      expect(mockInitIndex).toHaveBeenCalledWith('test-index-v2');
    });

    it('falls back to normal credentials when ?debug=true but override keys are not configured', () => {
      mockGetConfig.mockReturnValue({
        ALGOLIA_APP_ID: 'test-app-id',
        ALGOLIA_SEARCH_API_KEY: 'test-search-key',
        ALGOLIA_INDEX_NAME_V2: 'test-index-v2',
        ALGOLIA_INDEX_NAME: 'test-index-v1',
      });
      setUrl('?debug=true');

      getCourseAlgoliaIndex();

      expect(algoliasearch).toHaveBeenCalledWith('test-app-id', 'test-search-key');
    });

    it('uses normal credentials when override keys are configured but ?debug=true is absent', () => {
      setUrl('');

      getCourseAlgoliaIndex();

      expect(algoliasearch).toHaveBeenCalledWith('test-app-id', 'test-search-key');
    });

    it('uses normal credentials when debug is present but not "true"', () => {
      setUrl('?debug=false');

      getCourseAlgoliaIndex();

      expect(algoliasearch).toHaveBeenCalledWith('test-app-id', 'test-search-key');
    });
  });
});
