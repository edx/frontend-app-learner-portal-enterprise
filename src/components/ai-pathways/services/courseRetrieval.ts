import { SearchIndex, SearchOptions } from 'algoliasearch/lite';
import {
  CourseCardModel,
  CatalogTranslation,
  RetrievalLadderAttempt,
  RetrievalLadderTrace,
} from '../types';

const DEFAULT_HITS_PER_PAGE = 5;
const MIN_RESULTS = 3;

const formatFacet = (attr: string, value: string) => `${attr}:"${value.replace(/"/g, '\\"')}"`;

/**
 * Build scoped facetFilters entries from context.
 * Each entry is an AND group (single-value array) per Algolia facetFilters semantics.
 * Always includes ["content_type:course"]; adds locale and catalog query UUIDs when available.
 */
const buildScopedFacetFilters = (): string[][] => {
  const groups: string[][] = [['content_type:course']];

  return groups;
};

/**
 * Build parameters for Attempt 1: Strict skill facet matching.
 * Merges scoped facetFilters from baseParams with an OR group for strict skills.
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
    translation.strictSkills.map((skill) => `skill_names:${skill}`),
  ];

  return {
    ...baseParams,
    facetFilters,
  };
};

/**
 * Build parameters for Attempt 2: Optional skill boosting with text query.
 */
const buildBoostParams = (
  translation: CatalogTranslation,
  baseParams: SearchOptions,
): SearchOptions => {
  const params: SearchOptions = { ...baseParams };

  if (translation.boostSkills.length) {
    params.optionalFilters = translation.boostSkills.map(
      (skill) => formatFacet('skill_names', skill),
    );
  }

  return params;
};

/**
 * Build parameters for Attempt 3: Text query / Alternates fallback.
 */
const buildQueryFallbackParams = (
  query: string,
  baseParams: SearchOptions,
): SearchOptions => ({
  ...baseParams,
  query,
});

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
 * Retrieval ladder:
 * 1. Scoped `facetFilters` (content_type, locale, catalog UUIDs) + strict skill OR group
 * 2. Scoped `facetFilters` + boost skill `optionalFilters`
 * 3. Scoped `facetFilters` + query / queryAlternates
 * 4. Scoped `facetFilters` only (scope-only fallback)
 */
export const courseRetrievalService = {
  /**
   * Executes the course retrieval ladder grounded in the provided CatalogTranslation.
   *
   * @param index The Algolia search index for the course catalog.
   * @param translation The grounded translation results (query, skills, etc.).
   * @param context The enterprise search context.
   * @returns A promise resolving to 3-5 normalized CourseCardModel objects.
   */
  async fetchCourses(
    index: SearchIndex,
    translation: CatalogTranslation,
  ): Promise<{ courses: CourseCardModel[]; ladderTrace: RetrievalLadderTrace }> {
    const scopedFacetFilters = buildScopedFacetFilters();
    const baseParams: SearchOptions = {
      hitsPerPage: DEFAULT_HITS_PER_PAGE,
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
          label: 'Strict Facet Matching',
          query: translation.query,
          facetFilters: strictParams.facetFilters,
          hitCount: strictHits,
          winner: strictHits >= MIN_RESULTS,
        });
        if (strictHits >= MIN_RESULTS) {
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
        label: 'Boosted Optional Filters',
        query: translation.query,
        optionalFilters: boostParams.optionalFilters,
        hitCount: boostHits,
        winner: boostHits >= MIN_RESULTS,
      });
      if (boostHits >= MIN_RESULTS) {
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
          label: `Query Alternate: ${q}`,
          query: q,
          hitCount: queryHits,
          winner: queryHits >= MIN_RESULTS,
        });
        if (queryHits >= MIN_RESULTS) {
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
        label: 'Scope Only Fallback',
        query: '',
        hitCount: fallbackHits,
        winner: true,
      });
      return {
        courses: (fallbackResponse.hits || []).map(mapCourseHitToCard),
        ladderTrace: { attempts, winnerStep: 4 },
      };
    } catch (error) {
      attempts.push({ step: 1, label: 'Error', hitCount: 0, winner: false });
      return { courses: [], ladderTrace: { attempts, winnerStep: null } };
    }
  },
};
