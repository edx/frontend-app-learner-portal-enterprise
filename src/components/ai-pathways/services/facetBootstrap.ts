import { SearchIndex } from 'algoliasearch/lite';
import {
  FacetBootstrapContext,
  FacetReference,
  FacetValue,
} from '../types';

/**
 * Utility for bootstrapping taxonomy-like facets from Algolia.
 * Mimics Skills Quiz behavior by retrieving available facets for the current context.
 */
export const facetBootstrapService = {
  /**
   * Retrieves the facet universe for the given enterprise context.
   *
   * @param index The Algolia search index instance (Job/Career index).
   * @param context The context required for building the base scoped request.
   * @returns A promise resolving to the FacetReference object.
   */
  async bootstrapFacets(
    index: SearchIndex,
    context?: FacetBootstrapContext,
  ): Promise<FacetReference> {
    const facetFields = ['name', 'skills.name', 'industry_names', 'job_sources'];
    const filters = context?.enterpriseCustomerUuid
      ? `enterprise_customer_uuids:${context.enterpriseCustomerUuid}`
      : undefined;

    // Use an empty query to get the broad universe of facets for this enterprise
    const searchParams: Record<string, unknown> = {
      facets: facetFields,
      hitsPerPage: 0,
      maxValuesPerFacet: 500,
    };
    if (filters) {
      searchParams.filters = filters;
    }
    const response = await index.search('', searchParams);
    const facets = response.facets || {};
    const mapFacet = (facetName: string): FacetValue[] => {
      const values = facets[facetName] || {};
      return Object.entries(values).map(([value, count]) => ({
        value,
        count,
      })).sort((a, b) => b.count - a.count);
    };

    return {
      skills: mapFacet('skills.name'),
      industries: mapFacet('industry_names'),
      jobSources: mapFacet('job_sources'),
      name: mapFacet('name'),
    };
  },
};
