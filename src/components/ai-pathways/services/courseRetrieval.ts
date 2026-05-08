import {SearchClient, SearchIndex} from 'algoliasearch/lite';
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
import algoliasearch from "algoliasearch";
import {getConfig} from "@edx/frontend-platform/config";

/**
 * Formats a facet attribute and value for Algolia filtering.
 *
 * @param attr The facet attribute name (e.g., 'skill_names').
 * @param value The raw facet value to filter by.
 * @returns A properly escaped Algolia facet filter string.
 */
const formatFacet = (attr: string, value: string) => `${attr}:"${value.replace(/"/g, '\\"')}"`;

/**
 * Builds the base facet filters required to scope all searches to the relevant content.
 *
 * @returns A nested array representing Algolia's facet filter groups.
 * @remarks Always includes ["content_type:course"] to ensure only courses are retrieved.
 */
const buildScopedFacetFilters = (): string[][] => {
  const override = true;
  const groups: string[][] = [[CONTENT_TYPE_COURSE], override && [
    'enterprise_catalog_query_titles:Subscription',
  ]].filter(Boolean);

  return groups;
};

/**
 * Build parameters for Attempt 1: Strict skill facet matching.
 * Uses exact skill matches as required facet filters.
 *
 * @param translation The grounded search intent containing strict skills.
 * @param baseParams Pre-configured search options including scoped filters.
 * @returns Updated search options with strict facet filters.
 */
const buildStrictParams = (
  translation: CatalogTranslation,
  baseParams: SearchOptions,
): SearchOptions => {
  if (!translation.strictSkills.length) {
    return { ...baseParams, hitsPerPage: 0 };
  }

  const baseFacetFilters = (baseParams.facetFilters as string[][] | undefined) || [];
  const strictSkillFilters = translation.strictSkillFilters?.length
    ? translation.strictSkillFilters.map(({ catalogField, catalogSkill }) => (
      formatFacet(catalogField, catalogSkill)
    ))
    : translation.strictSkills.map((skill) => (
      formatFacet(FACET_FIELDS.SKILL_NAMES, skill)
    ));
  const facetFilters = [
    ...baseFacetFilters,
    strictSkillFilters,
  ];

  return {
    ...baseParams,
    facetFilters,
  };
};

/**
 * Build parameters for Attempt 2: Optional skill boosting with text query.
 * Uses skills as optional filters to improve relevance without restricting recall.
 *
 * @param translation The grounded search intent containing boost skills.
 * @param baseParams Pre-configured search options including scoped filters.
 * @returns Updated search options with optional (boosting) filters.
 */
const buildBoostParams = (
  translation: CatalogTranslation,
  baseParams: SearchOptions,
): SearchOptions => {
  if (translation.boostSkills.length) {
    const boostSkillFilters = translation.boostSkillFilters?.length
      ? translation.boostSkillFilters.map(({ catalogField, catalogSkill }) => (
        formatFacet(catalogField, catalogSkill)
      ))
      : translation.boostSkills.map((skill) => (
        formatFacet(FACET_FIELDS.SKILL_NAMES, skill)
      ));
    return {
      ...baseParams,
      optionalFilters: boostSkillFilters,
    };
  }

  return { ...baseParams };
};

/**
 * Build parameters for Attempt 3: Text query / Alternates fallback.
 * Performs a standard keyword search.
 *
 * @param query The specific search query string to use.
 * @param baseParams Pre-configured search options including scoped filters.
 * @returns Updated search options with the target query.
 */
const buildQueryFallbackParams = (
  query: string,
  baseParams: SearchOptions,
): SearchOptions => ({
  ...baseParams,
  query,
});

/**
 * Normalizes a raw Algolia course hit into a UI-ready CourseCardModel.
 *
 * @param hit The raw record retrieved from the Algolia catalog index.
 * @param idx The relative rank of this hit in the current search attempt.
 * @returns A structured model ready for rendering in the Pathway results.
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
 * Service for fetching and ranking courses from the Algolia catalog index.
 *
 * Pipeline context: This is the 'retrieval' phase. It takes the output of the
 * Translation stage and executes a progressive "ladder" of searches to find
 * the most relevant courses for the learner's goal.
 *
 * The Retrieval Ladder logic:
 * 1. Strict: Uses AI-confirmed skills as hard facet filters (High precision).
 * 2. Boost: Uses skills as optional boosting filters (Balanced).
 * 3. Alternate: Tries alternative search queries generated by the AI (Recall-focused).
 * 4. Fallback: Returns the top courses in the catalog scope (Fail-safe).
 */
export const courseRetrievalService = {
  /**
   * Executes the course retrieval ladder until sufficient results are found.
   *
   * @param index The Algolia SearchIndex instance for the course catalog.
   * @param translation The grounded search intent and search parameters.
   * @returns A promise resolving to the final course list and a trace of the retrieval steps.
   */
  async fetchCourses(
    // index: SearchIndex,
    translation: CatalogTranslation,
  ): Promise<{ courses: CourseCardModel[]; ladderTrace: RetrievalLadderTrace }> {
    const scopedFacetFilters = buildScopedFacetFilters();
    const config = getConfig();
    const searchClient: SearchClient = algoliasearch(
      config.ALGOLIA_APP_ID,
      config.ALGOLIA_SEARCH_API_KEY,
    );
    const index = searchClient.initIndex(config.ALGOLIA_INDEX_NAME);

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
