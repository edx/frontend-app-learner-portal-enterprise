import type { SearchIndex } from 'algoliasearch/lite';
import { catalogFacetService } from './catalogFacetService';

const buildIndex = (searchResponse: unknown): SearchIndex => ({
  search: jest.fn().mockResolvedValue(searchResponse),
} as unknown as SearchIndex);

describe('catalogFacetService.getFacetSnapshot', () => {
  it('issues a zero-hit query with the exact facet-snapshot params, scoped to course content only', async () => {
    const index = buildIndex({ facets: {} });

    await catalogFacetService.getFacetSnapshot(index);

    expect(index.search).toHaveBeenCalledTimes(1);
    expect(index.search).toHaveBeenCalledWith('', {
      facets: ['*'],
      hitsPerPage: 0,
      maxValuesPerFacet: 1000,
      filters: 'content_type:course',
    });
  });

  it('reads out all three facet groups from a fully-populated response', async () => {
    const index = buildIndex({
      facets: {
        skill_names: { SQL: 10, Python: 5 },
        'skills.name': { Agile: 3 },
        subjects: { 'Data Analysis': 8 },
      },
    });

    const snapshot = await catalogFacetService.getFacetSnapshot(index);

    expect(snapshot).toEqual({
      skill_names: ['SQL', 'Python'],
      'skills.name': ['Agile'],
      subjects: ['Data Analysis'],
    });
  });

  it('normalizes every group to an empty array when facets is entirely absent from the response', async () => {
    const index = buildIndex({});

    const snapshot = await catalogFacetService.getFacetSnapshot(index);

    expect(snapshot).toEqual({
      skill_names: [],
      'skills.name': [],
      subjects: [],
    });
  });

  it('normalizes only the missing groups to [] when the response includes a partial facets object', async () => {
    const index = buildIndex({
      facets: {
        skill_names: { SQL: 1 },
      },
    });

    const snapshot = await catalogFacetService.getFacetSnapshot(index);

    expect(snapshot).toEqual({
      skill_names: ['SQL'],
      'skills.name': [],
      subjects: [],
    });
  });

  it('propagates a rejected index.search call uncaught', async () => {
    const searchError = new Error('Algolia service unavailable');
    const index: SearchIndex = { search: jest.fn().mockRejectedValue(searchError) } as unknown as SearchIndex;

    await expect(catalogFacetService.getFacetSnapshot(index)).rejects.toThrow(searchError);
  });
});
