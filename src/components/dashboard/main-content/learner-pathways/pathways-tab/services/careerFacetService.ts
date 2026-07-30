import type { SearchIndex } from 'algoliasearch/lite';
import type { CareerFacetSnapshot } from '../types';

/** Maximum number of facet values to fetch from Algolia (to ensure high coverage). */
const MAX_VALUES_PER_FACET = 1000;

const FACET_FIELDS = {
  SKILLS_DOT_NAME: 'skills.name',
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
 * Service for retrieving the career/taxonomy index's `skills.name` facet vocabulary from
 * Algolia. The resulting `CareerFacetSnapshot` is the ground-truth dictionary
 * `careerSkillTranslation` uses to validate that a skill signal actually exists in the
 * index before it becomes a facet filter — preventing zero-result searches on terms that
 * sound plausible but aren't in scope. Unlike `catalogFacetService`, no catalog/tenant
 * scope is applied — the jobs/taxonomy index isn't enterprise-scoped.
 */
export const careerFacetService = {
  /**
   * Issues a zero-hit Algolia search (`hitsPerPage: 0`) against the career/taxonomy
   * index and reads out the `skills.name` facet group.
   *
   * @param index The configured Algolia `SearchIndex` for the career/taxonomy catalog.
   * @returns A `CareerFacetSnapshot` with `skills.name` normalized to an array.
   */
  async getFacetSnapshot(index: SearchIndex): Promise<CareerFacetSnapshot> {
    const response = await index.search('', {
      facets: [FACET_FIELDS.SKILLS_DOT_NAME],
      hitsPerPage: 0,
      maxValuesPerFacet: MAX_VALUES_PER_FACET,
    });

    const { facets } = response;

    return {
      'skills.name': safeReadFacet(facets, FACET_FIELDS.SKILLS_DOT_NAME),
    };
  },
};
