import { SearchIndex } from 'algoliasearch/lite';
import { AlgoliaRequestInput } from './algoliaRequestBuilder';
import { AlgoliaFilterBuilder } from '../../AlgoliaFilterBuilder';
import {
  FacetBootstrapContext,
  TaxonomyFacetBootstrap,
  TaxonomyResult,
  SearchIntent,
  FacetOption,
} from '../types';
import { adaptAlgoliaFacetsToRefinementItems } from './algolia.adapters';

/**
 * Service for performing imperative Algolia searches for content discovery.
 */
export const contentDiscoveryService = {
  /**
   * Performs the first-pass scoped discovery.
   * Sends base filters only (enterprise/catalog/locale).
   * Retrieves hits + facet universe.
   *
   * @param index The Algolia search index instance.
   * @param inputContext The context required for building the base scoped request.
   * @returns A promise resolving to the search response (facets + hits).
   */
  async bootstrapScopedUniverse(
    index: SearchIndex,
    inputContext: FacetBootstrapContext,
    condensedQuery: string,
  ): Promise<{
      facets: TaxonomyFacetBootstrap;
      hits: TaxonomyResult[];
      totalHits: number;
      request: {
        query: string;
        filters: string;
        facets: string[];
        hitsPerPage: number;
        maxValuesPerFacet: number;
        page: number;
      };
    }> {
    const builder = new AlgoliaFilterBuilder();

    // 1. Apply Enterprise Customer UUID
    if (inputContext.enterpriseCustomerUuid) {
      builder.filterByEnterpriseCustomerUuid(inputContext.enterpriseCustomerUuid);
    }

    // 2. Apply Catalog Filtering
    if (inputContext.searchCatalogs?.length) {
      if (inputContext.catalogUuidsToCatalogQueryUuids) {
        builder.filterByCatalogQueryUuids(
          inputContext.searchCatalogs,
          inputContext.catalogUuidsToCatalogQueryUuids,
        );
      } else {
        builder.filterByCatalogUuids(inputContext.searchCatalogs);
      }
    }

    // 3. Apply Locale
    if (inputContext.locale) {
      builder.filterByMetadataLanguage(inputContext.locale);
    }

    const filters = builder.build();

    const response = await index.search<TaxonomyResult>(condensedQuery, {
      analytics: false,
      attributesToRetrieve: ['*'],
      attributesToSnippet: ['*:20'],
      clickAnalytics: false,
      enableABTest: false,
      explain: true,
      facets: ['skills.name', 'industry_names', 'job_sources'],
      filters,
      getRankingInfo: true,
      hitsPerPage: 10,
      maxValuesPerFacet: 100,
      page: 0,
      responseFields: ['*'],
      snippetEllipsisText: '…',
      facetingAfterDistinct: true,
      analyticsTags: ['ai-pathways', 'mode:bootstrap-scoped'],
    } as any);

    return {
      facets: adaptAlgoliaFacetsToRefinementItems(response.facets || {}),
      hits: response.hits,
      totalHits: response.nbHits,
      request: {
        query: condensedQuery,
        filters,
        facets: ['*'],
        hitsPerPage: 10,
        maxValuesPerFacet: 100,
        page: 0,
      },
    };
  },

  /**
   * Correlates extracted user intent against the available facet universe.
   * Ensures only values that actually exist in the current scope are selected.
   *
   * @param intent The OpenAI-extracted intent.
   * @param universe The available facet universe from the first Algolia pass.
   * @returns Matched facet values only.
   */
  correlateIntentWithFacets(
    intent: SearchIntent,
    universe: TaxonomyFacetBootstrap,
  ): { 'skills.name': string[]; 'industry_names': string[]; 'job_sources': string[] } {
    const matchValues = (extracted: string[], available: FacetOption[]): string[] => {
      const availableLabels = new Set(available.map(item => item.label.toLowerCase()));
      const availableValues = new Set(available.map(item => item.value.toLowerCase()));

      return extracted
        .map(e => e.trim())
        .filter(e => {
          const lowerE = e.toLowerCase();
          return availableLabels.has(lowerE) || availableValues.has(lowerE);
        })
        .map(e => {
          const lowerE = e.toLowerCase();
          const match = available.find(
            item => item.label.toLowerCase() === lowerE || item.value.toLowerCase() === lowerE,
          );
          return match ? match.value : e; // prefer exact value from facet
        });
    };

    return {
      'skills.name': matchValues(
        [...intent.skillsRequired, ...intent.skillsPreferred],
        universe['skills.name'].items,
      ),
      industry_names: matchValues(
        intent.roles || [], // industries might be inferred or we can add industry intent later
        universe.industry_names.items,
      ),
      job_sources: matchValues(
        intent.roles || [],
        universe.job_sources.items,
      ),
    };
  },

  /**
   * Performs the second-pass refined search using only matched facet values.
   *
   * @param index The Algolia search index instance.
   * @param inputContext Base context (filters).
   * @param selections Matched facet values from correlation.
   * @param condensedQuery The seeded query string to maintain text relevance.
   * @returns Refined hits and metadata.
   */
  async refineDiscovery(
    index: SearchIndex,
    inputContext: FacetBootstrapContext,
    selections: { 'skills.name': string[]; 'industry_names': string[]; 'job_sources': string[] },
    condensedQuery: string,
  ): Promise<{ hits: TaxonomyResult[]; totalHits: number }> {
    // Defensive: ensure we never search with empty query
    if (!condensedQuery || !condensedQuery.trim()) {
      // eslint-disable-next-line no-console
      console.error('[contentDiscovery] refineDiscovery called with empty condensedQuery');
      throw new Error('refineDiscovery requires non-empty condensedQuery for text relevance');
    }

    const builder = new AlgoliaFilterBuilder();

    // 1. Base Scope
    if (inputContext.enterpriseCustomerUuid) {
      builder.filterByEnterpriseCustomerUuid(inputContext.enterpriseCustomerUuid);
    }
    if (inputContext.searchCatalogs?.length) {
      if (inputContext.catalogUuidsToCatalogQueryUuids) {
        builder.filterByCatalogQueryUuids(
          inputContext.searchCatalogs,
          inputContext.catalogUuidsToCatalogQueryUuids,
        );
      } else {
        builder.filterByCatalogUuids(inputContext.searchCatalogs);
      }
    }
    if (inputContext.locale) {
      builder.filterByMetadataLanguage(inputContext.locale);
    }

    // 2. Refinements
    if (selections['skills.name'].length) {
      builder.or('skills.name', selections['skills.name'], { stringify: true });
    }
    if (selections.industry_names.length) {
      builder.or('industry_names', selections.industry_names, { stringify: true });
    }
    if (selections.job_sources.length) {
      builder.or('job_sources', selections.job_sources, { stringify: true });
    }

    const filters = builder.build();

    const response = await index.search<TaxonomyResult>(condensedQuery, {
      filters,
      hitsPerPage: 20,
      analyticsTags: ['ai-pathways', 'mode:refined-discovery'],
    });

    return {
      hits: response.hits,
      totalHits: response.nbHits,
    };
  },

  /**
   * Discovers content based on structured Algolia request input.
   * [DEPRECATED in favor of staged flow]
   *
   * @param index The Algolia search index instance.
   * @param input The structured request parameters.
   * @returns A promise resolving to the search results.
   */
  async discoverContent(index: SearchIndex, input: AlgoliaRequestInput) {
    const filters = this.buildFilters(input);

    // 1. Optional filters for ranking (Algolia optionalFilters syntax)
    const optionalFilters: string[] = [];
    Object.entries(input.optionalFilters || {}).forEach(([attribute, values]) => {
      values.forEach(value => {
        optionalFilters.push(`${attribute}:${value}`);
      });
    });

    // 2. Execute Search
    return index.search(input.query, {
      filters,
      optionalFilters,
      facets: ['skills.name', 'industry_names', 'job_sources'], // Request known practical facets
      attributesToRetrieve: input.attributesToRetrieve,
      hitsPerPage: input.hitsPerPage,
      // Ensure we get all necessary metadata for reasoning
      analyticsTags: ['ai-pathways', `mode:${input.metadata.mode}`],
    });
  },

  /**
   * Helper to build a filter string from structured AlgoliaRequestInput.
   *
   * @param input The structured request parameters.
   * @returns An Algolia filter string.
   */
  buildFilters(input: AlgoliaRequestInput): string {
    const builder = new AlgoliaFilterBuilder();

    // 1. Process Required Filters (AND logic)
    Object.entries(input.requiredFilters).forEach(([attribute, values]) => {
      if (attribute === 'catalog_query_uuids') {
        builder.or(attribute, values);
      } else if (attribute === 'enterprise_customer_uuid') {
        builder.filterByEnterpriseCustomerUuid(values[0]);
      } else if (attribute === 'locale') {
        builder.filterByMetadataLanguage(values[0]);
      } else if (values.length === 1) {
        builder.and(attribute, values[0], { stringify: true });
      } else if (values.length > 1) {
        builder.or(attribute, values, { stringify: true });
      }
    });

    // 2. Process Excluded Filters (NOT logic)
    Object.entries(input.excludedFilters || {}).forEach(([attribute, values]) => {
      values.forEach(value => {
        builder.andRaw(`NOT ${attribute}:"${value}"`);
      });
    });

    return builder.build();
  },
};
