import { SearchIndex } from 'algoliasearch/lite';
import { AlgoliaRequestInput } from './algoliaRequestBuilder';
import { AlgoliaFilterBuilder } from '../../AlgoliaFilterBuilder';
import { FacetBootstrapContext, TaxonomyFacetBootstrap } from '../types';
import { adaptAlgoliaFacets } from './algolia.adapters';

/**
 * Service for performing imperative Algolia searches for content discovery.
 */
export const contentDiscoveryService = {
  /**
   * Discovers content based on structured Algolia request input.
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
   * Specifically bootstraps metadata/facets from the taxonomy index.
   * Does not use freeform user prose as a query.
   *
   * @param index The Algolia search index instance.
   * @param inputContext The context required for building the bootstrap request.
   * @returns A promise resolving to the normalized taxonomy facets.
   */
  async bootstrapFacets(
    index: SearchIndex,
    inputContext: FacetBootstrapContext,
  ): Promise<TaxonomyFacetBootstrap> {
    const builder = new AlgoliaFilterBuilder();

    // 1. Apply Enterprise Customer UUID
    if (inputContext.enterpriseCustomerUuid) {
      builder.filterByEnterpriseCustomerUuid(inputContext.enterpriseCustomerUuid);
    }

    // 2. Apply Catalog Filtering (prefer secured mapping if available)
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

    const response = await index.search('', {
      filters,
      facets: ['skills.name', 'industry_names', 'job_sources'],
      maxValuesPerFacet: 50,
      hitsPerPage: 0,
      analyticsTags: ['ai-pathways', 'mode:bootstrap'],
    });

    return adaptAlgoliaFacets(response.facets || {});
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
      } else {
        if (values.length === 1) {
          builder.and(attribute, values[0], { stringify: true });
        } else if (values.length > 1) {
          builder.or(attribute, values, { stringify: true });
        }
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
