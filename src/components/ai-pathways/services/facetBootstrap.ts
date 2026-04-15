import { SearchIndex } from 'algoliasearch/lite';
import {
  FacetBootstrapContext,
  FacetReference,
  FacetValue,
} from '../types';

/**
 * @typedef {Object} FacetValue
 * @property {string} value - The facet value string
 * @property {number} count - Frequency count in the index
 */

/**
 * @typedef {Object} FacetReference
 * @property {FacetValue[]} skills - Available skills
 * @property {FacetValue[]} industries - Available industries
 * @property {FacetValue[]} jobSources - Available job sources
 * @property {FacetValue[]} name - Available career/job names
 */

/**
 * Utility for bootstrapping taxonomy-like facets from Algolia.
 *
 * @remarks
 * Pipeline: intake (initialization)
 *
 * Dependencies:
 * - Algolia SearchIndex.search()
 * - FacetBootstrapContext (scoping)
 *
 * Notes:
 * - Mimics Skills Quiz behavior by retrieving available facets for the current context.
 * - Used to populate the intake form with valid options.
 */
export const facetBootstrapService = {
  /**
   * Retrieves the facet universe for the given enterprise context.
   *
   * @param {SearchIndex} index - The Algolia search index instance (Job/Career index).
   * @param {FacetBootstrapContext} [context] - The context required for building the base scoped request.
   * @returns {Promise<FacetReference>} Promise resolving to the FacetReference object.
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
