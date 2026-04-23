import { SearchIndex } from 'algoliasearch/lite';
import {
  FacetBootstrapContext,
  FacetReference,
  FacetValue,
} from '../types';
import { MAX_VALUES_PER_FACET } from '../constants';

/**
 * Service for bootstrapping common taxonomy facet values from Algolia.
 *
 * Pipeline context: This is an auxiliary stage executed during the initial
 * 'facetBootstrap' phase. It fetches the top values for skills, industries,
 * and job roles from the taxonomy index.
 *
 * These values are injected into the Intent Extraction prompt to provide the AI
 * with a "vocabulary" of valid search terms, improving the quality of the
 * generated condensedQuery.
 */
export const facetBootstrapService = {
  /**
   * Fetches and normalizes the top facet values from the provided Algolia index.
   *
   * @param index The Algolia SearchIndex instance (typically the taxonomy/job index).
   * @param context Optional context for enterprise-specific scoping.
   * @returns A promise resolving to a structured FacetReference object.
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
      maxValuesPerFacet: MAX_VALUES_PER_FACET,
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
