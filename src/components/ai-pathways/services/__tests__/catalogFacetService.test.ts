import { catalogFacetService } from '../catalogFacetService';
import { SearchIndex } from 'algoliasearch/lite';
import { FACET_FIELDS } from '../../constants';

describe('catalogFacetService', () => {
  let mockIndex: jest.Mocked<SearchIndex>;

  beforeEach(() => {
    mockIndex = {
      search: jest.fn(),
    } as any;
  });

  describe('getFacetSnapshot', () => {
    it('fetches facets from Algolia with default filters', async () => {
      const mockResponse = {
        facets: {
          [FACET_FIELDS.SKILL_NAMES]: { Skill1: 10, Skill2: 5 },
          [FACET_FIELDS.SKILLS_DOT_NAME]: { Skill3: 3 },
          [FACET_FIELDS.SUBJECTS]: { Subject1: 1 },
          [FACET_FIELDS.LEVEL_TYPE]: { Beginner: 1 },
          [FACET_FIELDS.PARTNERS_NAME]: { Partner1: 1 },
        },
        hits: [],
        nbHits: 0,
      };
      mockIndex.search.mockResolvedValue(mockResponse as any);

      const { snapshot, trace } = await catalogFacetService.getFacetSnapshot(mockIndex);

      expect(mockIndex.search).toHaveBeenCalledWith('', expect.objectContaining({
        facets: ['*'],
        hitsPerPage: 0,
        facetFilters: [['content_type:course']],
      }));

      expect(snapshot.skill_names).toEqual(['Skill1', 'Skill2']);
      expect(snapshot['skills.name']).toEqual(['Skill3']);
      expect(trace.skillNamesCount).toBe(2);
      expect(trace.sampleSkillNames).toEqual(['Skill1', 'Skill2']);
    });

    it('handles missing facets in Algolia response', async () => {
      mockIndex.search.mockResolvedValue({
        facets: undefined,
        hits: [],
        nbHits: 0,
      } as any);

      const { snapshot } = await catalogFacetService.getFacetSnapshot(mockIndex);

      expect(snapshot.skill_names).toEqual([]);
      expect(snapshot.subjects).toEqual([]);
    });

    it('applies enterprise catalog filters if context is provided', async () => {
      const context = {
        searchCatalogs: ['cat-1'],
        catalogUuidsToCatalogQueryUuids: {
          'cat-1': 'query-uuid-1',
        },
      };

      mockIndex.search.mockResolvedValue({
        facets: {},
        hits: [],
        nbHits: 0,
      } as any);

      await catalogFacetService.getFacetSnapshot(mockIndex, {}, context as any);

      expect(mockIndex.search).toHaveBeenCalledWith('', expect.objectContaining({
        facetFilters: [
          ['content_type:course'],
          ['enterprise_catalog_query_uuids:query-uuid-1']
        ],
      }));
    });

    it('ignores catalog filters if mapping is missing', async () => {
      const context = {
        searchCatalogs: ['cat-1'],
        // catalogUuidsToCatalogQueryUuids is missing
      };

      mockIndex.search.mockResolvedValue({
        facets: {},
        hits: [],
        nbHits: 0,
      } as any);

      await catalogFacetService.getFacetSnapshot(mockIndex, {}, context as any);

      expect(mockIndex.search).toHaveBeenCalledWith('', expect.objectContaining({
        facetFilters: [['content_type:course']],
      }));
    });
  });
});
