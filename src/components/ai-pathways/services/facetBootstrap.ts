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
   * Fetches the top facet values for skills, industries, job roles, and job sources
   * from the Algolia taxonomy index using a zero-hit search (`hitsPerPage: 0`).
   *
   * The returned `FacetReference` is sorted by occurrence count (descending) so that
   * the most commonly required terms appear first when injected into the Xpert
   * intent-extraction system prompt — improving vocabulary coverage without inflating
   * prompt token usage.
   *
   * @param index The Algolia `SearchIndex` instance pointing to the taxonomy (job) catalog.
   * @param context Optional enterprise context; when `enterpriseCustomerUuid` is provided,
   *   a `filters` expression scopes the facet retrieval to that enterprise's data only.
   * @returns A promise resolving to a `FacetReference` with `skills`, `industries`,
   *   `jobSources`, and `name` arrays, each sorted by Algolia hit count descending.
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
