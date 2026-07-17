import type { SearchIndex } from 'algoliasearch/lite';
import { buildCourseCatalogScopeFilters } from './courseCatalogScopeFilters';
import type { CatalogFacetSnapshot, CourseRetrievalCatalogScope } from '../types';

/** Maximum number of facet values to fetch from Algolia (to ensure high coverage). */
const MAX_VALUES_PER_FACET = 1000;

const FACET_FIELDS = {
  SKILL_NAMES: 'skill_names',
  SKILLS_DOT_NAME: 'skills.name',
  SUBJECTS: 'subjects',
  LEVEL_TYPE: 'level_type',
  PARTNERS_NAME: 'partners.name',
} as const;

/**
 * Safely extracts the list of facet values for a given key from an Algolia facet
 * response. Returns an empty array when the key is absent or the response is
 * undefined, since Algolia omits a facet entirely when it has no values in scope.
 */
const safeReadFacet = (facets: Record<string, Record<string, number>> | undefined, key: string): string[] => (
  facets && facets[key] ? Object.keys(facets[key]) : []
);

/**
 * Service for retrieving the scoped course-catalog facet vocabulary from Algolia. The
 * resulting `CatalogFacetSnapshot` is the ground-truth dictionary `catalogSkillTranslation`
 * uses to validate that a skill/subject signal actually exists in the learner's specific
 * catalog before it becomes a facet filter — preventing zero-result searches on terms
 * that sound plausible but aren't in scope.
 */
export const catalogFacetService = {
  /**
   * Issues a zero-hit Algolia search (`hitsPerPage: 0`) scoped to course content within
   * the given catalog scope, and reads out the five facet groups the retrieval ladder
   * and skill translation need.
   *
   * @param index The configured Algolia `SearchIndex` for the course catalog.
   * @param catalogScope Already-resolved enterprise catalog scope to restrict the snapshot to.
   * @returns A `CatalogFacetSnapshot` with all five groups normalized to arrays.
   */
  async getFacetSnapshot(
    index: SearchIndex,
    catalogScope: CourseRetrievalCatalogScope,
  ): Promise<CatalogFacetSnapshot> {
    const filters = buildCourseCatalogScopeFilters(catalogScope);

    const response = await index.search('', {
      facets: ['*'],
      hitsPerPage: 0,
      maxValuesPerFacet: MAX_VALUES_PER_FACET,
      filters,
    });

    const { facets } = response;

    return {
      skill_names: safeReadFacet(facets, FACET_FIELDS.SKILL_NAMES),
      'skills.name': safeReadFacet(facets, FACET_FIELDS.SKILLS_DOT_NAME),
      subjects: safeReadFacet(facets, FACET_FIELDS.SUBJECTS),
      level_type: safeReadFacet(facets, FACET_FIELDS.LEVEL_TYPE),
      'partners.name': safeReadFacet(facets, FACET_FIELDS.PARTNERS_NAME),
    };
  },
};
