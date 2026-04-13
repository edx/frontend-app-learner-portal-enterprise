import { SearchIndex } from 'algoliasearch/lite';
import { CatalogFacetSnapshot, FacetRetrievalConfig } from '../types/catalogFacet';
import { FacetBootstrapContext } from '../types';
import { debugLogger } from '../utils/debugLogger';

/**
 * Validation helper that safely reads missing facets as empty arrays.
 * This ensures the application doesn't crash if Algolia returns an unexpected shape
 * or if a facet has no values.
 */
const safeReadFacet = (facets: Record<string, Record<string, number>> | undefined, key: string): string[] => {
  if (!facets || !facets[key]) {
    return [];
  }
  // Algolia returns facets as a map of { value: count }. We only need the keys (values).
  return Object.keys(facets[key]);
};

/**
 * Service for retrieving scoped catalog facets from Algolia.
 * These facets are used to ground the taxonomy-to-catalog translation process,
 * ensuring that we only attempt to search for courses using valid catalog vocabulary.
 *
 * This service will be used by later translation steps to:
 * 1. Prune taxonomy skills that don't exist in the catalog.
 * 2. Map taxonomy skills to their nearest catalog equivalent.
 * 3. Provide valid subjects and levels for Xpert-driven refinement.
 */
export const catalogFacetService = {
  /**
   * Fetches a snapshot of all relevant facets for the scoped course catalog.
   *
   * @param index The Algolia search index for courses.
   * @param config Optional configuration for the facet retrieval.
   * @returns A promise resolving to a normalized CatalogFacetSnapshot.
   */
  async getFacetSnapshot(
    index: SearchIndex,
    config: FacetRetrievalConfig = {},
    context?: FacetBootstrapContext,
  ): Promise<CatalogFacetSnapshot> {
    const { maxValuesPerFacet = 1000 } = config;

    // Build facetFilters to scope the snapshot to the enterprise catalog.
    // content_type:course scopes to courses; catalog query UUIDs restrict to the enterprise catalog.
    const facetFilters: string[][] = [['content_type:course']];

    if (context?.searchCatalogs?.length && context?.catalogUuidsToCatalogQueryUuids) {
      const queryUuids = context.searchCatalogs
        .map(cat => context.catalogUuidsToCatalogQueryUuids![cat])
        .filter(Boolean);
      if (queryUuids.length) {
        facetFilters.push(queryUuids.map(uuid => `enterprise_catalog_query_uuids:${uuid}`));
      }
    }

    // Query Algolia for facets only (hitsPerPage: 0)
    // We use an empty query ('') to get the full universe of available values within the scope.
    const response = await index.search('', {
      facets: ['*'],
      hitsPerPage: 0,
      maxValuesPerFacet,
      facetFilters,
    });

    const { facets } = response;
    const snapshot: CatalogFacetSnapshot = {
      skill_names: safeReadFacet(facets, 'skill_names'),
      'skills.name': safeReadFacet(facets, 'skills.name'),
      subjects: safeReadFacet(facets, 'subjects'),
      level_type: safeReadFacet(facets, 'level_type'),
      'partners.name': safeReadFacet(facets, 'partners.name'),
    };

    debugLogger.log('Facet Snapshot Summary', {
      skill_names: debugLogger.summarizeList(snapshot.skill_names),
      'skills.name': debugLogger.summarizeList(snapshot['skills.name']),
      subjects: debugLogger.summarizeList(snapshot.subjects),
      level_type: debugLogger.summarizeList(snapshot.level_type),
      'partners.name': debugLogger.summarizeList(snapshot['partners.name']),
    });

    return snapshot;
  },
};
