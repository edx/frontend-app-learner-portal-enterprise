import { renderHook } from '@testing-library/react';
import useCatalogAlgoliaSearch from './useCatalogAlgoliaSearch';

const mockInitIndex = jest.fn((name: string) => ({ indexName: name }));
jest.mock('algoliasearch/lite', () => jest.fn(() => ({ initIndex: mockInitIndex })));

const mockGetConfig = jest.fn();
jest.mock('@edx/frontend-platform/config', () => ({
  getConfig: () => mockGetConfig(),
}));

describe('useCatalogAlgoliaSearch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns null client and index when ALGOLIA_STAGE_APP_ID_OVERRIDE is missing', () => {
    mockGetConfig.mockReturnValue({
      ALGOLIA_STAGE_APP_ID_OVERRIDE: '',
      ALGOLIA_STAGE_SEARCH_API_KEY_OVERRIDE: 'test-key',
      ALGOLIA_INDEX_NAME: 'test-index',
    });

    const { result } = renderHook(() => useCatalogAlgoliaSearch());

    expect(result.current.searchClient).toBeNull();
    expect(result.current.searchIndex).toBeNull();
  });

  it('returns null client and index when ALGOLIA_STAGE_SEARCH_API_KEY_OVERRIDE is missing', () => {
    mockGetConfig.mockReturnValue({
      ALGOLIA_STAGE_APP_ID_OVERRIDE: 'test-app-id',
      ALGOLIA_STAGE_SEARCH_API_KEY_OVERRIDE: '',
      ALGOLIA_INDEX_NAME: 'test-index',
    });

    const { result } = renderHook(() => useCatalogAlgoliaSearch());

    expect(result.current.searchClient).toBeNull();
    expect(result.current.searchIndex).toBeNull();
  });

  it('returns null when no resolvable index name is available and no indexName arg is provided', () => {
    mockGetConfig.mockReturnValue({
      ALGOLIA_STAGE_APP_ID_OVERRIDE: 'test-app-id',
      ALGOLIA_STAGE_SEARCH_API_KEY_OVERRIDE: 'test-key',
      ALGOLIA_INDEX_NAME_V2: '',
      ALGOLIA_INDEX_NAME: '',
    });

    const { result } = renderHook(() => useCatalogAlgoliaSearch());

    expect(result.current.searchClient).toBeNull();
    expect(result.current.searchIndex).toBeNull();
  });

  it('returns populated searchClient and searchIndex when all config keys are present, defaulting to ALGOLIA_INDEX_NAME_V2', () => {
    mockGetConfig.mockReturnValue({
      ALGOLIA_STAGE_APP_ID_OVERRIDE: 'test-app-id',
      ALGOLIA_STAGE_SEARCH_API_KEY_OVERRIDE: 'test-key',
      ALGOLIA_INDEX_NAME_V2: 'test-index-v2',
      ALGOLIA_INDEX_NAME: 'test-index',
    });

    const { result } = renderHook(() => useCatalogAlgoliaSearch());

    expect(result.current.searchClient).not.toBeNull();
    expect(result.current.searchIndex).not.toBeNull();
    expect(mockInitIndex).toHaveBeenCalledWith('test-index-v2');
  });

  it('falls back to ALGOLIA_INDEX_NAME when ALGOLIA_INDEX_NAME_V2 is absent', () => {
    mockGetConfig.mockReturnValue({
      ALGOLIA_STAGE_APP_ID_OVERRIDE: 'test-app-id',
      ALGOLIA_STAGE_SEARCH_API_KEY_OVERRIDE: 'test-key',
      ALGOLIA_INDEX_NAME_V2: '',
      ALGOLIA_INDEX_NAME: 'test-index',
    });

    const { result } = renderHook(() => useCatalogAlgoliaSearch());

    expect(result.current.searchIndex).not.toBeNull();
    expect(mockInitIndex).toHaveBeenCalledWith('test-index');
  });

  it('uses the indexName argument over config defaults', () => {
    mockGetConfig.mockReturnValue({
      ALGOLIA_STAGE_APP_ID_OVERRIDE: 'test-app-id',
      ALGOLIA_STAGE_SEARCH_API_KEY_OVERRIDE: 'test-key',
      ALGOLIA_INDEX_NAME_V2: 'default-index-v2',
      ALGOLIA_INDEX_NAME: 'default-index',
    });

    const { result } = renderHook(() => useCatalogAlgoliaSearch('custom-index'));

    expect(result.current.searchIndex).not.toBeNull();
    expect(mockInitIndex).toHaveBeenCalledWith('custom-index');
  });
});
