import type { SearchIndex } from 'algoliasearch/lite';
import { catalogFacetService } from './catalogFacetService';
import type { CourseRetrievalCatalogScope } from '../types';

const buildIndex = (searchResponse: unknown): SearchIndex => ({
  search: jest.fn().mockResolvedValue(searchResponse),
} as unknown as SearchIndex);

const catalogScope: CourseRetrievalCatalogScope = {
  searchCatalogs: ['cat-1', 'cat-2'],
  catalogUuidsToCatalogQueryUuids: { 'cat-1': 'query-1', 'cat-2': 'query-2' },
};

describe('catalogFacetService.getFacetSnapshot', () => {
  it('issues a zero-hit query with the exact facet-snapshot params, scoped to courses and the catalog', async () => {
    const index = buildIndex({ facets: {} });

    await catalogFacetService.getFacetSnapshot(index, catalogScope);

    expect(index.search).toHaveBeenCalledTimes(1);
    expect(index.search).toHaveBeenCalledWith('', {
      facets: ['*'],
      hitsPerPage: 0,
      maxValuesPerFacet: 1000,
      filters: 'content_type:course AND (enterprise_catalog_query_uuids:query-1 OR enterprise_catalog_query_uuids:query-2)',
    });
  });

  it('omits the catalog clause when no search catalogs are resolvable, keeping only the content-type scope', async () => {
    const index = buildIndex({ facets: {} });
    const emptyScope: CourseRetrievalCatalogScope = { searchCatalogs: [], catalogUuidsToCatalogQueryUuids: {} };

    await catalogFacetService.getFacetSnapshot(index, emptyScope);

    expect(index.search).toHaveBeenCalledWith('', expect.objectContaining({
      filters: 'content_type:course',
    }));
  });

  it('reads out all five facet groups from a fully-populated response', async () => {
    const index = buildIndex({
      facets: {
        skill_names: { SQL: 10, Python: 5 },
        'skills.name': { Agile: 3 },
        subjects: { 'Data Analysis': 8 },
        level_type: { Introductory: 20 },
        'partners.name': { edX: 15 },
      },
    });

    const snapshot = await catalogFacetService.getFacetSnapshot(index, catalogScope);

    expect(snapshot).toEqual({
      skill_names: ['SQL', 'Python'],
      'skills.name': ['Agile'],
      subjects: ['Data Analysis'],
      level_type: ['Introductory'],
      'partners.name': ['edX'],
    });
  });

  it('normalizes every group to an empty array when facets is entirely absent from the response', async () => {
    const index = buildIndex({});

    const snapshot = await catalogFacetService.getFacetSnapshot(index, catalogScope);

    expect(snapshot).toEqual({
      skill_names: [],
      'skills.name': [],
      subjects: [],
      level_type: [],
      'partners.name': [],
    });
  });

  it('normalizes only the missing groups to [] when the response includes a partial facets object', async () => {
    const index = buildIndex({
      facets: {
        skill_names: { SQL: 1 },
      },
    });

    const snapshot = await catalogFacetService.getFacetSnapshot(index, catalogScope);

    expect(snapshot).toEqual({
      skill_names: ['SQL'],
      'skills.name': [],
      subjects: [],
      level_type: [],
      'partners.name': [],
    });
  });

  it('propagates a rejected index.search call uncaught', async () => {
    const searchError = new Error('Algolia service unavailable');
    const index: SearchIndex = { search: jest.fn().mockRejectedValue(searchError) } as unknown as SearchIndex;

    await expect(catalogFacetService.getFacetSnapshot(index, catalogScope)).rejects.toThrow(searchError);
  });
});
