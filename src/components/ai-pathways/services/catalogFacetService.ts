import { SearchClient } from 'algoliasearch/lite';
import { getConfig } from '@edx/frontend-platform/config';
import algoliasearch from 'algoliasearch';
import { CatalogFacetSnapshot, FacetRetrievalConfig } from '../types/catalogFacet';
import { FacetBootstrapContext, FacetSnapshotTrace } from '../types';
import {
  MAX_VALUES_PER_FACET,
  CONTENT_TYPE_COURSE,
  FACET_FIELDS,
} from '../constants';

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
 *
 * Pipeline context: This stage is executed at the beginning of the 'catalogTranslation'
 * phase. It captures the authoritative vocabulary currently available in the
 * learner's specific course catalog.
 *
 * These facets are used to ground the taxonomy-to-catalog translation process,
 * ensuring that we only search for courses using valid catalog terms.
 * This prevents the AI from suggesting skills or subjects that return zero results.
 */
export const catalogFacetService = {
  /**
   * Fetches a snapshot of all relevant facets for the scoped course catalog.
   *
   * @param index The Algolia SearchIndex for the course catalog.
   * @param config Optional configuration for facet retrieval limits and filters.
   * @param context Enterprise-specific context used to scope the search to the correct catalog.
   * @returns A promise resolving to a normalized CatalogFacetSnapshot and a debug trace.
   */
  async getFacetSnapshot(
    // index: SearchIndex,
    config: FacetRetrievalConfig = {},
    context?: FacetBootstrapContext,
  ): Promise<{ snapshot: CatalogFacetSnapshot; trace: FacetSnapshotTrace }> {
    const { maxValuesPerFacet = MAX_VALUES_PER_FACET } = config;
    const configg = getConfig();
    const searchClient: SearchClient = algoliasearch(
      configg.ALGOLIA_APP_ID,
      configg.ALGOLIA_SEARCH_API_KEY,
    );
    const index = searchClient.initIndex(configg.ALGOLIA_INDEX_NAME);

    // Build facetFilters to scope the snapshot to the enterprise catalog.
    // content_type:course scopes to courses; catalog query UUIDs restrict to the enterprise catalog.
    const facetFilters: string[][] = [[CONTENT_TYPE_COURSE]];

    if (context?.searchCatalogs?.length && context?.catalogUuidsToCatalogQueryUuids) {
      const queryUuids = context.searchCatalogs
        .map(cat => context.catalogUuidsToCatalogQueryUuids![cat])
        .filter(Boolean);
      if (queryUuids.length) {
        facetFilters.push(queryUuids.map(uuid => `${FACET_FIELDS.ENTERPRISE_CATALOG_QUERY_UUIDS}:${uuid}`));
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
      skill_names: safeReadFacet(facets, FACET_FIELDS.SKILL_NAMES),
      'skills.name': safeReadFacet(facets, FACET_FIELDS.SKILLS_DOT_NAME),
      subjects: safeReadFacet(facets, FACET_FIELDS.SUBJECTS),
      level_type: safeReadFacet(facets, FACET_FIELDS.LEVEL_TYPE),
      'partners.name': safeReadFacet(facets, FACET_FIELDS.PARTNERS_NAME),
    };

    const trace: FacetSnapshotTrace = {
      skillNamesCount: snapshot.skill_names.length,
      skillsDotNameCount: snapshot['skills.name'].length,
      subjectsCount: snapshot.subjects.length,
      levelTypeCount: snapshot.level_type.length,
      partnersNameCount: snapshot['partners.name'].length,
      sampleSkillNames: snapshot.skill_names.slice(0, 5),
      sampleSubjects: snapshot.subjects.slice(0, 5),
    };

    return { snapshot, trace };
  },
};
