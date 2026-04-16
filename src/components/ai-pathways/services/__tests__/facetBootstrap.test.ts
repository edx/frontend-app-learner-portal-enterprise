import { SearchIndex } from 'algoliasearch/lite';
import { facetBootstrapService } from '../facetBootstrap';

describe('facetBootstrapService', () => {
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

  it('calls Algolia with empty query and correct facets', async () => {
    (mockIndex.search as jest.Mock).mockResolvedValueOnce({
      facets: {
        'skills.name': { Python: 10, SQL: 5 },
        industry_names: { Technology: 20 },
        job_sources: { LinkedIn: 15 },
        name: { 'Software Engineer': 30 },
      },
    });

    const result = await facetBootstrapService.bootstrapFacets(mockIndex, mockContext);

    expect(mockIndex.search).toHaveBeenCalledWith('', expect.objectContaining({
      facets: ['name', 'skills.name', 'industry_names', 'job_sources'],
      filters: expect.stringContaining('enterprise_customer_uuids:ent-123'),
      hitsPerPage: 0,
      maxValuesPerFacet: 500,
    }));

    expect(result.skills).toHaveLength(2);
    expect(result.skills).toContainEqual({ value: 'Python', count: 10 });
    expect(result.skills).toContainEqual({ value: 'SQL', count: 5 });
    expect(result.industries).toHaveLength(1);
    expect(result.industries[0]).toEqual({ value: 'Technology', count: 20 });
    expect(result.jobSources).toHaveLength(1);
    expect(result.jobSources[0]).toEqual({ value: 'LinkedIn', count: 15 });
    expect(result.name).toHaveLength(1);
    expect(result.name[0]).toEqual({ value: 'Software Engineer', count: 30 });
  });

  it('returns empty arrays if no facets are returned', async () => {
    (mockIndex.search as jest.Mock).mockResolvedValueOnce({
      facets: {},
    });

    const result = await facetBootstrapService.bootstrapFacets(mockIndex, mockContext);

    expect(result.skills).toEqual([]);
    expect(result.industries).toEqual([]);
    expect(result.jobSources).toEqual([]);
    expect(result.name).toEqual([]);
  });
});
