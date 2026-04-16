import { SearchIndex } from 'algoliasearch/lite';
import { courseRetrievalService } from '../courseRetrieval';
import { CatalogTranslation } from '../../types';

describe('courseRetrievalService', () => {
  const mockIndex = {
    search: jest.fn(),
  } as unknown as SearchIndex;

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

    const { courses } = await courseRetrievalService.fetchCourses(mockIndex, mockTranslation);

    expect(mockIndex.search).toHaveBeenCalledTimes(1);
    expect(courses).toHaveLength(3);
  });

  it('level 2: falls back to boosted optional filters if strict fails', async () => {
    (mockIndex.search as jest.Mock).mockResolvedValueOnce({ hits: [] });
    (mockIndex.search as jest.Mock).mockResolvedValueOnce({
      hits: Array(4).fill({ objectID: 'c', title: 'Boosted Course' }),
    });

    const { courses } = await courseRetrievalService.fetchCourses(mockIndex, mockTranslation);

    expect(mockIndex.search).toHaveBeenCalledTimes(2);
    expect(mockIndex.search).toHaveBeenLastCalledWith('Software Engineer', expect.objectContaining({
      optionalFilters: ['skill_names:"Docker"'],
    }));
    expect(courses).toHaveLength(4);
  });

  it('level 3: falls back to query alternates if boosted fails', async () => {
    (mockIndex.search as jest.Mock).mockResolvedValueOnce({ hits: [] });
    (mockIndex.search as jest.Mock).mockResolvedValueOnce({ hits: [] });
    (mockIndex.search as jest.Mock).mockResolvedValueOnce({ hits: [] });
    (mockIndex.search as jest.Mock).mockResolvedValueOnce({
      hits: Array(3).fill({ objectID: 'c', title: 'Alt Course' }),
    });

    const { courses } = await courseRetrievalService.fetchCourses(mockIndex, mockTranslation);

    expect(mockIndex.search).toHaveBeenCalledTimes(4);
    expect(courses).toHaveLength(3);
  });

  it('level 4: returns scope-only results if all else fails', async () => {
    (mockIndex.search as jest.Mock).mockResolvedValue({ hits: [] });
    (mockIndex.search as jest.Mock).mockResolvedValueOnce({ hits: [] }); // 1
    (mockIndex.search as jest.Mock).mockResolvedValueOnce({ hits: [] }); // 2
    (mockIndex.search as jest.Mock).mockResolvedValueOnce({ hits: [] }); // 3
    (mockIndex.search as jest.Mock).mockResolvedValueOnce({ hits: [] }); // 4
    (mockIndex.search as jest.Mock).mockResolvedValueOnce({ hits: [] }); // 5
    (mockIndex.search as jest.Mock).mockResolvedValueOnce({
      hits: [{ objectID: 'fallback', title: 'Fallback Course' }],
    }); // 6

    const { courses } = await courseRetrievalService.fetchCourses(mockIndex, mockTranslation);

    expect(courses).toHaveLength(1);
    expect(courses[0].id).toBe('fallback');
  });

  it('handles Algolia errors gracefully', async () => {
    (mockIndex.search as jest.Mock).mockRejectedValueOnce(new Error('Algolia error'));
    const { courses } = await courseRetrievalService.fetchCourses(mockIndex, mockTranslation);
    expect(courses).toEqual([]);
  });

  it('applies scoped facetFilters correctly when falling through to boosted step', async () => {
    (mockIndex.search as jest.Mock).mockResolvedValueOnce({ hits: [] }); // strict: 0
    (mockIndex.search as jest.Mock).mockResolvedValueOnce({
      hits: Array(3).fill({ objectID: 'c', title: 'Course' }),
    }); // boost: 3

    await courseRetrievalService.fetchCourses(mockIndex, mockTranslation);

    expect(mockIndex.search).toHaveBeenCalledTimes(2);
  });
});
