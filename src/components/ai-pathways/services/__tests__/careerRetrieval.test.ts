import { SearchIndex } from 'algoliasearch/lite';
import { careerRetrievalService } from '../careerRetrieval';
import { DEFAULT_INTENT } from '../xpertContract';

describe('careerRetrievalService', () => {
  const mockIndex = {
    search: jest.fn(),
  } as unknown as SearchIndex;

  const mockContext = {
    enterpriseCustomerUuid: 'ent-123',
    searchCatalogs: ['cat-abc'],
    catalogUuidsToCatalogQueryUuids: { 'cat-abc': 'query-abc' },
    locale: 'en',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('builds correct Algolia query from intent', async () => {
    (mockIndex.search as jest.Mock).mockResolvedValueOnce({
      hits: [
        {
          id: '1',
          title: 'Software Engineer',
          description: 'Build things',
          skills: [{ name: 'React' }],
          industries: ['Tech'],
        },
      ],
    });

    const intent = {
      ...DEFAULT_INTENT,
      condensedQuery: 'engineer',
      industries: ['Tech'],
      skillsRequired: ['React'],
    };

    const result = await careerRetrievalService.searchCareers(mockIndex, intent, mockContext);

    expect(mockIndex.search).toHaveBeenCalledWith('engineer', expect.objectContaining({
      filters: expect.stringContaining('industry_names:"Tech"'),
      optionalFilters: expect.arrayContaining(['skills.name:"React"']),
    }));

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Software Engineer');
    expect(result[0].skills).toEqual(['React']);
  });

  it('handles excludeTags in filters', async () => {
    (mockIndex.search as jest.Mock).mockResolvedValueOnce({ hits: [] });

    const intent = {
      ...DEFAULT_INTENT,
      excludeTags: ['PHP', 'Ruby'],
    };

    await careerRetrievalService.searchCareers(mockIndex, intent, mockContext);

    expect(mockIndex.search).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
      filters: expect.stringContaining('NOT skills.name:"PHP"'),
    }));
    expect(mockIndex.search).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
      filters: expect.stringContaining('NOT skills.name:"Ruby"'),
    }));
  });
});
