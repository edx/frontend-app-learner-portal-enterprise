import { SearchIndex } from 'algoliasearch/lite';
import { contentDiscoveryService } from '../contentDiscovery.service';
import { SearchIntent, TaxonomyFacetBootstrap } from '../../types';
import {
  mockSearchIntent,
  mockTaxonomyUniverse,
} from '../../__tests__/fixtures';

describe('contentDiscoveryService Staged Flow', () => {
  const mockIndex = {
    search: jest.fn(),
  } as unknown as SearchIndex;

  const mockBaseContext = {
    enterpriseCustomerUuid: 'ent-123',
    searchCatalogs: ['cat-abc'],
    catalogUuidsToCatalogQueryUuids: { 'cat-abc': 'query-abc' },
    locale: 'en',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('bootstrapScopedUniverse', () => {
    it('calls Algolia with base filters and condensed query', async () => {
      (mockIndex.search as jest.Mock).mockResolvedValueOnce({
        hits: [{ id: '1', title: 'Test Job' }],
        facets: {
          'skills.name': { Python: 10 },
          industry_names: { Technology: 20 },
        },
        nbHits: 1,
      });

      const result = await contentDiscoveryService.bootstrapScopedUniverse(
        mockIndex,
        mockBaseContext,
        'software engineering',
      );

      expect(mockIndex.search).toHaveBeenCalledWith('software engineering', expect.objectContaining({
        filters: expect.stringContaining('enterprise_customer_uuids:ent-123'),
        facets: ['skills.name', 'industry_names', 'job_sources'],
        attributesToRetrieve: ['*'],
        attributesToSnippet: ['*:20'],
        hitsPerPage: 10,
        maxValuesPerFacet: 100,
        page: 0,
        facetingAfterDistinct: true,
      }));

      // Verify it used the catalog query uuid mapping
      expect(mockIndex.search).toHaveBeenCalledWith('software engineering', expect.objectContaining({
        filters: expect.stringContaining('enterprise_catalog_query_uuids:query-abc'),
      }));

      expect(result.totalHits).toBe(1);
      expect(result.facets['skills.name'].items).toHaveLength(1);
      expect(result.request.query).toBe('software engineering');
    });
  });

  describe('correlateIntentWithFacets', () => {
    it('only selects available facet values from the universe', () => {
      const intent: SearchIntent = {
        ...mockSearchIntent,
        skillsRequired: ['Python', 'Unmatched Skill'],
        skillsPreferred: ['Data Science'],
        roles: ['Software Engineer'],
      };

      const universe: TaxonomyFacetBootstrap = {
        ...mockTaxonomyUniverse,
        'skills.name': {
          items: [
            {
              label: 'Python', value: 'Python', count: 10, isRefined: false,
            },
            {
              label: 'Data Science', value: 'Data Science', count: 5, isRefined: false,
            },
          ],
        },
      };

      const matched = contentDiscoveryService.correlateIntentWithFacets(intent, universe);

      // 'Python' and 'Data Science' are in mockUniverse, 'Unmatched Skill' is not.
      expect(matched['skills.name']).toContain('Python');
      expect(matched['skills.name']).toContain('Data Science');
      expect(matched['skills.name']).not.toContain('Unmatched Skill');

      // 'Software Engineer' matches label in job_sources in mockTaxonomyUniverse
      expect(matched.job_sources).toContain('Software Engineer');
    });

    it('handles case-insensitive matching', () => {
      const intent: SearchIntent = {
        ...mockSearchIntent,
        skillsRequired: ['python'],
      };
      const universe: TaxonomyFacetBootstrap = {
        ...mockTaxonomyUniverse,
        'skills.name': {
          items: [{
            label: 'Python', value: 'Python', count: 10, isRefined: false,
          }],
        },
      };

      const matched = contentDiscoveryService.correlateIntentWithFacets(intent, universe);
      expect(matched['skills.name']).toContain('Python');
    });
  });

  describe('refineDiscovery', () => {
    it('calls Algolia with condensedQuery and matched facet filters', async () => {
      (mockIndex.search as jest.Mock).mockResolvedValueOnce({
        hits: [{ id: 'refined-1' }],
        nbHits: 1,
      });

      const selections = {
        'skills.name': ['Python'],
        industry_names: ['Technology'],
        job_sources: [],
      };

      const result = await contentDiscoveryService.refineDiscovery(
        mockIndex,
        mockBaseContext,
        selections,
        'software engineering',
      );

      expect(mockIndex.search).toHaveBeenCalledWith('software engineering', expect.objectContaining({
        filters: expect.stringContaining('skills.name:"Python"'),
      }));
      expect(mockIndex.search).toHaveBeenCalledWith('software engineering', expect.objectContaining({
        filters: expect.stringContaining('industry_names:"Technology"'),
      }));
      expect(result.hits[0].id).toBe('refined-1');
    });

    it('throws error when called with empty condensedQuery', async () => {
      const selections = {
        'skills.name': ['Python'],
        industry_names: [],
        job_sources: [],
      };

      await expect(
        contentDiscoveryService.refineDiscovery(mockIndex, mockBaseContext, selections, ''),
      ).rejects.toThrow('refineDiscovery requires non-empty condensedQuery');

      await expect(
        contentDiscoveryService.refineDiscovery(mockIndex, mockBaseContext, selections, '   '),
      ).rejects.toThrow('refineDiscovery requires non-empty condensedQuery');
    });
  });
});
