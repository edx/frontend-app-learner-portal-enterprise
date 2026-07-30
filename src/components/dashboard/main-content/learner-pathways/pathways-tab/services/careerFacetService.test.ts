import type { SearchIndex } from 'algoliasearch/lite';
import { careerFacetService } from './careerFacetService';

const buildIndex = (searchResponse: unknown): SearchIndex => ({
  search: jest.fn().mockResolvedValue(searchResponse),
} as unknown as SearchIndex);

describe('careerFacetService.getFacetSnapshot', () => {
  it('issues a zero-hit query for skills.name only, with no catalog/content-type scope', async () => {
    const index = buildIndex({ facets: {} });

    await careerFacetService.getFacetSnapshot(index);

    expect(index.search).toHaveBeenCalledTimes(1);
    expect(index.search).toHaveBeenCalledWith('', {
      facets: ['skills.name'],
      hitsPerPage: 0,
      maxValuesPerFacet: 1000,
    });
  });

  it('reads out the skills.name facet group from a populated response', async () => {
    const index = buildIndex({
      facets: {
        'skills.name': { React: 10, SQL: 5 },
      },
    });

    const snapshot = await careerFacetService.getFacetSnapshot(index);

    expect(snapshot).toEqual({ 'skills.name': ['React', 'SQL'] });
  });

  it('normalizes to an empty array when facets is entirely absent from the response', async () => {
    const index = buildIndex({});

    const snapshot = await careerFacetService.getFacetSnapshot(index);

    expect(snapshot).toEqual({ 'skills.name': [] });
  });

  it('normalizes to an empty array when the response has a facets object but no skills.name key', async () => {
    const index = buildIndex({ facets: { industry_names: { Tech: 1 } } });

    const snapshot = await careerFacetService.getFacetSnapshot(index);

    expect(snapshot).toEqual({ 'skills.name': [] });
  });

  it('propagates a rejected index.search call uncaught', async () => {
    const searchError = new Error('Algolia service unavailable');
    const index: SearchIndex = { search: jest.fn().mockRejectedValue(searchError) } as unknown as SearchIndex;

    await expect(careerFacetService.getFacetSnapshot(index)).rejects.toThrow(searchError);
  });
});
