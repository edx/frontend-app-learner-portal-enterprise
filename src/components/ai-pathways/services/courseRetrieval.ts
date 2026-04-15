import { SearchIndex } from 'algoliasearch/lite';
import { SearchOptions } from '@algolia/client-search';
import {
  CourseCardModel,
  CatalogTranslation,
  RetrievalLadderAttempt,
  RetrievalLadderTrace,
  CourseRetrievalHit,
} from '../types';

import {
  COURSE_RETRIEVAL_LIMIT,
  MIN_RESULTS_THRESHOLD,
  CONTENT_TYPE_COURSE,
  FACET_FIELDS,
  RETRIEVAL_LADDER_STEPS,
} from '../constants';

/**
 * @typedef {Object} CourseCardModel
 * @property {string} id - Unique identifier
 * @property {string} title - Course title
 * @property {string|null} level - Course difficulty level
 * @property {string[]} skills - List of associated skills
 * @property {string|null} marketingUrl - URL to course marketing page
 * @property {string|null} imageUrl - URL to course card image
 * @property {string} status - Recommendation status ('recommended', 'optional', 'unavailable')
 */

/**
 * @typedef {Object} RetrievalLadderTrace
 * @property {RetrievalLadderAttempt[]} attempts - History of retrieval attempts
 * @property {number|null} winnerStep - The successful step in the ladder (1-4)
 */

/**
 * Formats a facet attribute and value for Algolia filtering.
 *
 * @param {string} attr - Facet attribute name
 * @param {string} value - Facet value
 * @returns {string} Formatted Algolia facet string
 */
const formatFacet = (attr: string, value: string) => `${attr}:"${value.replace(/"/g, '\\"')}"`;

/**
 * Build scoped facetFilters entries from context.
 *
 * @returns {string[][]} Array of Algolia facet filter groups
 *
 * @remarks
 * Always includes ["content_type:course"].
 */
const buildScopedFacetFilters = (): string[][] => {
  const groups: string[][] = [[CONTENT_TYPE_COURSE]];

  return groups;
};

/**
 * Build parameters for Attempt 1: Strict skill facet matching.
 *
 * @param {CatalogTranslation} translation - Grounded search intent
 * @param {SearchOptions} baseParams - Base Algolia search options
 * @returns {SearchOptions} Updated search options
 */
const buildStrictParams = (
  translation: CatalogTranslation,
  baseParams: SearchOptions,
): SearchOptions => {
  if (!translation.strictSkills.length) {
    return { ...baseParams, hitsPerPage: 0 };
  }

  // Append skill OR group to any existing scoped facetFilters
  const baseFacetFilters = (baseParams.facetFilters as string[][] | undefined) || [];
  const facetFilters = [
    ...baseFacetFilters,
    translation.strictSkills.map((skill) => `${FACET_FIELDS.SKILL_NAMES}:${skill}`),
  ];

  return {
    ...baseParams,
    facetFilters,
  };
};

/**
 * Build parameters for Attempt 2: Optional skill boosting with text query.
 *
 * @param {CatalogTranslation} translation - Grounded search intent
 * @param {SearchOptions} baseParams - Base Algolia search options
 * @returns {SearchOptions} Updated search options
 */
const buildBoostParams = (
  translation: CatalogTranslation,
  baseParams: SearchOptions,
): SearchOptions => {
  if (translation.boostSkills.length) {
    return {
      ...baseParams,
      optionalFilters: translation.boostSkills.map(
        (skill) => formatFacet(FACET_FIELDS.SKILL_NAMES, skill),
      ),
    };
  }

  return { ...baseParams };
};

/**
 * Build parameters for Attempt 3: Text query / Alternates fallback.
 *
 * @param {string} query - Search query string
 * @param {SearchOptions} baseParams - Base Algolia search options
 * @returns {SearchOptions} Updated search options
 */
const buildQueryFallbackParams = (
  query: string,
  baseParams: SearchOptions,
): SearchOptions => ({
  ...baseParams,
  query,
});

/**
 * Maps a raw Algolia hit to a CourseCardModel.
 *
 * @param {any} hit - Raw Algolia search result
 * @param {number} idx - Index of the hit in the results
 * @returns {CourseCardModel} Normalized course card data
 */
const mapCourseHitToCard = (hit: any, idx: number): CourseCardModel => ({
  id: hit.id || hit.objectID,
  title: hit.title || hit.name || '',
  level: hit.level || hit.difficulty || hit.pacing_type || null,
  skills: Array.isArray(hit.skill_names) ? hit.skill_names : [],
  marketingUrl: hit.marketing_url || hit.url || hit.advertised_course_run_url || null,
  imageUrl: hit.image_url || hit.card_image_url || hit.image?.src || null,
  shortDescription: hit.short_description || hit.description || hit.full_description || null,
  order: idx + 1,
  status: 'recommended',
  raw: hit,
});

/**
 * Service for fetching courses from the scoped catalog index based on CatalogTranslation.
 *
 * @remarks
 * Pipeline: translation → retrieval → mapping
 *
 * Dependencies:
 * - Algolia SearchIndex.search()
 * - CatalogTranslation contract
 * - CourseCardModel UI contract
 *
 * Retrieval ladder:
 * 1. Scoped `facetFilters` + strict skill OR group
 * 2. Scoped `facetFilters` + boost skill `optionalFilters`
 * 3. Scoped `facetFilters` + query / queryAlternates
 * 4. Scoped `facetFilters` only (scope-only fallback)
 *
 * Notes:
 * - Ensures all results are scoped to the enterprise catalog (content_type:course, etc).
 * - Implements a "fail-soft" ladder to ensure the user always gets results.
 */
export const courseRetrievalService = {
  /**
   * Executes the course retrieval ladder grounded in the provided CatalogTranslation.
   *
   * @param {SearchIndex} index - The Algolia search index for the course catalog.
   * @param {CatalogTranslation} translation - The grounded translation results (query, skills, etc.).
   * @returns {Promise<{ courses: CourseCardModel[]; ladderTrace: RetrievalLadderTrace }>}
   * Promise resolving to course cards and trace.
   */
  async fetchCourses(
    index: SearchIndex,
    translation: CatalogTranslation,
  ): Promise<{ courses: CourseCardModel[]; ladderTrace: RetrievalLadderTrace }> {
    const scopedFacetFilters = buildScopedFacetFilters();
    const baseParams: SearchOptions = {
      hitsPerPage: COURSE_RETRIEVAL_LIMIT,
      facetFilters: scopedFacetFilters,
    };

    const attempts: RetrievalLadderAttempt[] = [];

    try {
      // 1. Attempt Strict Facet Matching
      const strictParams = buildStrictParams(translation, baseParams);
      if ((strictParams.hitsPerPage ?? 1) > 0) {
        const strictResponse = await index.search(translation.query, strictParams);
        const strictHits = strictResponse.hits?.length ?? 0;
        attempts.push({
          step: 1,
          label: RETRIEVAL_LADDER_STEPS.STRICT,
          query: translation.query,
          facetFilters: strictParams.facetFilters,
          hitCount: strictHits,
          winner: strictHits >= MIN_RESULTS_THRESHOLD,
          hits: (strictResponse.hits || []) as unknown as CourseRetrievalHit[],
        });
        if (strictHits >= MIN_RESULTS_THRESHOLD) {
          return {
            courses: strictResponse.hits.map(mapCourseHitToCard),
            ladderTrace: { attempts, winnerStep: 1 },
          };
        }
      }

      // 2. Attempt Boosted Optional Filters
      const boostParams = buildBoostParams(translation, baseParams);
      const boostResponse = await index.search(translation.query, boostParams);
      const boostHits = boostResponse.hits?.length ?? 0;
      attempts.push({
        step: 2,
        label: RETRIEVAL_LADDER_STEPS.BOOST,
        query: translation.query,
        optionalFilters: boostParams.optionalFilters,
        hitCount: boostHits,
        winner: boostHits >= MIN_RESULTS_THRESHOLD,
        hits: (boostResponse.hits || []) as unknown as CourseRetrievalHit[],
      });
      if (boostHits >= MIN_RESULTS_THRESHOLD) {
        return {
          courses: boostResponse.hits.map(mapCourseHitToCard),
          ladderTrace: { attempts, winnerStep: 2 },
        };
      }

      // 3. Attempt Query Alternates
      const queries = [translation.query, ...translation.queryAlternates].filter(Boolean);
      for (const q of queries) {
        const queryParams = buildQueryFallbackParams(q, baseParams);
        // eslint-disable-next-line no-await-in-loop
        const queryResponse = await index.search(q, queryParams);
        const queryHits = queryResponse.hits?.length ?? 0;
        attempts.push({
          step: 3,
          label: `${RETRIEVAL_LADDER_STEPS.QUERY_ALTERNATE}: ${q}`,
          query: q,
          hitCount: queryHits,
          winner: queryHits >= MIN_RESULTS_THRESHOLD,
          hits: (queryResponse.hits || []) as unknown as CourseRetrievalHit[],
        });
        if (queryHits >= MIN_RESULTS_THRESHOLD) {
          return {
            courses: queryResponse.hits.map(mapCourseHitToCard),
            ladderTrace: { attempts, winnerStep: 3 },
          };
        }
      }

      // 4. Final Fallback: Scope Only
      const fallbackResponse = await index.search('', baseParams);
      const fallbackHits = fallbackResponse.hits?.length ?? 0;
      attempts.push({
        step: 4,
        label: RETRIEVAL_LADDER_STEPS.FALLBACK,
        query: '',
        hitCount: fallbackHits,
        winner: true,
        hits: (fallbackResponse.hits || []) as unknown as CourseRetrievalHit[],
      });
      return {
        courses: (fallbackResponse.hits || []).map(mapCourseHitToCard),
        ladderTrace: { attempts, winnerStep: 4 },
      };
    } catch (error) {
      attempts.push({
        step: 1, label: 'Error', hitCount: 0, winner: false,
      });
      return { courses: [], ladderTrace: { attempts, winnerStep: null } };
    }
  },
};
