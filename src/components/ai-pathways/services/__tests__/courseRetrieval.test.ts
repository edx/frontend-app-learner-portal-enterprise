import { SearchIndex } from 'algoliasearch/lite';
import { courseRetrievalService } from '../courseRetrieval';

describe('courseRetrievalService', () => {
  const mockIndex = {
    search: jest.fn(),
  } as unknown as SearchIndex;

  const mockContext = {
    enterpriseCustomerUuid: 'ent-123',
    locale: 'en',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches courses using skill_names in facetFilters', async () => {
    (mockIndex.search as jest.Mock).mockResolvedValueOnce({
      hits: [
        {
          objectID: 'course-1',
          title: 'React Fundamentals',
          skill_names: ['React'],
        },
      ],
    });

    const result = await courseRetrievalService.fetchCoursesForCareer(
      mockIndex,
      ['React'],
      mockContext,
    );

    expect(mockIndex.search).toHaveBeenCalledWith('', expect.objectContaining({
      facetFilters: [['skill_names:React']],
      filters: expect.stringContaining('content_type:course'),
    }));

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('React Fundamentals');
  });

  it('returns empty array if no skills provided', async () => {
    const result = await courseRetrievalService.fetchCoursesForCareer(mockIndex, [], mockContext);
    expect(result).toEqual([]);
    expect(mockIndex.search).not.toHaveBeenCalled();
  });

  it('handles Algolia errors gracefully', async () => {
    (mockIndex.search as jest.Mock).mockRejectedValueOnce(new Error('Algolia error'));
    const result = await courseRetrievalService.fetchCoursesForCareer(mockIndex, ['Skill'], mockContext);
    expect(result).toEqual([]);
  });
});
