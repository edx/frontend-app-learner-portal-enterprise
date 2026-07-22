import algoliasearch from 'algoliasearch';
import { getDebugCourseAlgoliaIndexOverride } from './courseAlgoliaIndex';

jest.mock('algoliasearch', () => jest.fn());

const mockGetConfig = jest.fn();
jest.mock('@edx/frontend-platform/config', () => ({
  getConfig: () => mockGetConfig(),
}));

const setUrl = (search: string) => {
  window.history.pushState({}, '', `/${search}`);
};

describe('getDebugCourseAlgoliaIndexOverride', () => {
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

  it('returns null when ?debug=true is absent, even with override keys configured', () => {
    mockGetConfig.mockReturnValue({
      ALGOLIA_APP_ID: 'test-app-id',
      ALGOLIA_SEARCH_API_KEY: 'test-search-key',
      ALGOLIA_INDEX_NAME_V2: 'test-index-v2',
      ALGOLIA_INDEX_NAME: 'test-index-v1',
      ALGOLIA_STAGE_APP_ID_OVERRIDE: 'stage-app-id',
      ALGOLIA_STAGE_SEARCH_API_KEY_OVERRIDE: 'stage-search-key',
    });

    const result = getDebugCourseAlgoliaIndexOverride();

    expect(result).toBeNull();
    expect(algoliasearch).not.toHaveBeenCalled();
  });

  it('returns null when debug is present but not "true"', () => {
    setUrl('?debug=false');
    mockGetConfig.mockReturnValue({
      ALGOLIA_APP_ID: 'test-app-id',
      ALGOLIA_SEARCH_API_KEY: 'test-search-key',
      ALGOLIA_STAGE_APP_ID_OVERRIDE: 'stage-app-id',
      ALGOLIA_STAGE_SEARCH_API_KEY_OVERRIDE: 'stage-search-key',
    });

    const result = getDebugCourseAlgoliaIndexOverride();

    expect(result).toBeNull();
  });

  it('returns null when ?debug=true but override keys are not configured', () => {
    setUrl('?debug=true');

    const result = getDebugCourseAlgoliaIndexOverride();

    expect(result).toBeNull();
    expect(algoliasearch).not.toHaveBeenCalled();
  });

  it('returns null when only one override key is configured', () => {
    setUrl('?debug=true');
    mockGetConfig.mockReturnValue({
      ALGOLIA_APP_ID: 'test-app-id',
      ALGOLIA_SEARCH_API_KEY: 'test-search-key',
      ALGOLIA_STAGE_APP_ID_OVERRIDE: 'stage-app-id',
    });

    const result = getDebugCourseAlgoliaIndexOverride();

    expect(result).toBeNull();
  });

  it('resolves the override client/index when ?debug=true and both override keys are configured', () => {
    setUrl('?debug=true');
    mockGetConfig.mockReturnValue({
      ALGOLIA_APP_ID: 'test-app-id',
      ALGOLIA_SEARCH_API_KEY: 'test-search-key',
      ALGOLIA_INDEX_NAME_V2: 'test-index-v2',
      ALGOLIA_INDEX_NAME: 'test-index-v1',
      ALGOLIA_STAGE_APP_ID_OVERRIDE: 'stage-app-id',
      ALGOLIA_STAGE_SEARCH_API_KEY_OVERRIDE: 'stage-search-key',
    });

    const result = getDebugCourseAlgoliaIndexOverride();

    expect(algoliasearch).toHaveBeenCalledWith('stage-app-id', 'stage-search-key');
    expect(mockInitIndex).toHaveBeenCalledWith('test-index-v2');
    expect(result).toEqual(expect.objectContaining({ search: expect.any(Function) }));
  });

  it('prefers ALGOLIA_INDEX_NAME_V2 on the override index, falling back to ALGOLIA_INDEX_NAME when unset', () => {
    setUrl('?debug=true');
    mockGetConfig.mockReturnValue({
      ALGOLIA_APP_ID: 'test-app-id',
      ALGOLIA_SEARCH_API_KEY: 'test-search-key',
      ALGOLIA_INDEX_NAME: 'test-index-v1',
      ALGOLIA_STAGE_APP_ID_OVERRIDE: 'stage-app-id',
      ALGOLIA_STAGE_SEARCH_API_KEY_OVERRIDE: 'stage-search-key',
    });

    getDebugCourseAlgoliaIndexOverride();

    expect(mockInitIndex).toHaveBeenCalledWith('test-index-v1');
  });
});
