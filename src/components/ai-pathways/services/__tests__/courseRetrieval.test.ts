import { SearchIndex } from 'algoliasearch/lite';
import { courseRetrievalService } from '../courseRetrieval';
import { CatalogTranslation } from '../../types';

describe('courseRetrievalService', () => {
  const mockIndex = {
    search: jest.fn(),
  } as unknown as SearchIndex;

  const mockContext = {
    enterpriseCustomerUuid: 'ent-123',
    locale: 'en',
    searchCatalogs: ['cat-abc'],
    catalogUuidsToCatalogQueryUuids: { 'cat-abc': 'query-abc' },
  };

  const mockTranslation: CatalogTranslation = {
    query: 'Software Engineer',
    queryAlternates: ['Web Developer', 'Programmer'],
    strictSkills: ['Python', 'SQL'],
    boostSkills: ['Docker'],
    subjectHints: ['Computer Science'],
    droppedTaxonomySkills: [],
    skillProvenance: [],
    algoliaPrimaryRequest: {},
    algoliaFallbackRequests: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('level 1: returns results from strict facet matching if enough results found', async () => {
    (mockIndex.search as jest.Mock).mockResolvedValueOnce({
      hits: Array(3).fill({ objectID: 'c', title: 'Course' }),
    });

    const result = await courseRetrievalService.fetchCourses(mockIndex, mockTranslation, mockContext);

    expect(mockIndex.search).toHaveBeenCalledTimes(1);
    expect(mockIndex.search).toHaveBeenCalledWith('Software Engineer', expect.objectContaining({
      facetFilters: [['skill_names:Python', 'skill_names:SQL']],
    }));
    expect(result).toHaveLength(3);
  });

  it('level 2: falls back to boosted optional filters if strict fails', async () => {
    // 1. Strict returns 0
    (mockIndex.search as jest.Mock).mockResolvedValueOnce({ hits: [] });
    // 2. Boosted returns 4
    (mockIndex.search as jest.Mock).mockResolvedValueOnce({
      hits: Array(4).fill({ objectID: 'c', title: 'Boosted Course' }),
    });

    const result = await courseRetrievalService.fetchCourses(mockIndex, mockTranslation, mockContext);

    expect(mockIndex.search).toHaveBeenCalledTimes(2);
    expect(mockIndex.search).toHaveBeenLastCalledWith('Software Engineer', expect.objectContaining({
      optionalFilters: ['skill_names:"Docker"'],
    }));
    expect(result).toHaveLength(4);
  });

  it('level 3: falls back to query alternates if boosted fails', async () => {
    // 1. Strict returns 0
    (mockIndex.search as jest.Mock).mockResolvedValueOnce({ hits: [] });
    // 2. Boosted returns 0
    (mockIndex.search as jest.Mock).mockResolvedValueOnce({ hits: [] });
    // 3. Primary query returns 0
    (mockIndex.search as jest.Mock).mockResolvedValueOnce({ hits: [] });
    // 4. First alternate returns 3
    (mockIndex.search as jest.Mock).mockResolvedValueOnce({
      hits: Array(3).fill({ objectID: 'c', title: 'Alt Course' }),
    });

    const result = await courseRetrievalService.fetchCourses(mockIndex, mockTranslation, mockContext);

    expect(mockIndex.search).toHaveBeenCalledTimes(4);
    expect(mockIndex.search).toHaveBeenNthCalledWith(4, 'Web Developer', expect.objectContaining({
      query: 'Web Developer',
    }));
    expect(result).toHaveLength(3);
  });

  it('level 4: returns scope-only results if all else fails', async () => {
    // We expect 6 calls: Strict, Boosted, Query, Alt1, Alt2, and finally Fallback.
    // We want the first 5 to return empty or not enough results, and the 6th to return the fallback.
    (mockIndex.search as jest.Mock).mockResolvedValue({ hits: [] });
    (mockIndex.search as jest.Mock).mockResolvedValueOnce({ hits: [] }); // 1
    (mockIndex.search as jest.Mock).mockResolvedValueOnce({ hits: [] }); // 2
    (mockIndex.search as jest.Mock).mockResolvedValueOnce({ hits: [] }); // 3
    (mockIndex.search as jest.Mock).mockResolvedValueOnce({ hits: [] }); // 4
    (mockIndex.search as jest.Mock).mockResolvedValueOnce({ hits: [] }); // 5
    (mockIndex.search as jest.Mock).mockResolvedValueOnce({
      hits: [{ objectID: 'fallback', title: 'Fallback Course' }],
    }); // 6

    const result = await courseRetrievalService.fetchCourses(mockIndex, mockTranslation, mockContext);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('fallback');
  });

  it('handles Algolia errors gracefully', async () => {
    (mockIndex.search as jest.Mock).mockRejectedValueOnce(new Error('Algolia error'));
    const result = await courseRetrievalService.fetchCourses(mockIndex, mockTranslation, mockContext);
    expect(result).toEqual([]);
  });

  it('applies scoped filters correctly', async () => {
    (mockIndex.search as jest.Mock).mockResolvedValueOnce({
      hits: Array(3).fill({ objectID: 'c', title: 'Course' }),
    });

    await courseRetrievalService.fetchCourses(mockIndex, mockTranslation, mockContext);

    expect(mockIndex.search).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
      filters: expect.stringContaining('enterprise_customer_uuids:ent-123'),
    }));
    expect(mockIndex.search).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
      filters: expect.stringContaining('metadata_language:en'),
    }));
    expect(mockIndex.search).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
      filters: expect.stringContaining('enterprise_catalog_query_uuids:query-abc'),
    }));
    expect(mockIndex.search).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
      filters: expect.stringContaining('content_type:course'),
    }));
  });
});
