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
  TOP_N_REDUCED_FACETS,
  CONTENT_TYPE_COURSE,
  RETRIEVAL_LADDER_STEPS,
} from '../constants';

/**
 * Formats a facet attribute and value for Algolia filtering.
 */
const formatFacet = (attr: string, value: string) => `${attr}:"${value.replace(/"/g, '\\"')}"`;

/**
 * Builds the base facet filters required to scope all searches to the relevant content.
 */
const buildScopedFacetFilters = (): string[][] => {
  const override = true;
  const groups: string[][] = [[CONTENT_TYPE_COURSE], override && [
    'enterprise_catalog_query_titles:Subscription',
  ]].filter(Boolean);

  return groups;
};

/**
 * Build parameters for Step 1: Facet-first with ALL mapped skills.
 * Uses all strictSkillFilters as a single OR group; query is empty string.
 */
const buildStrictParams = (
  translation: CatalogTranslation,
  baseParams: SearchOptions,
): SearchOptions => {
  if (!translation.strictSkillFilters?.length) {
    return { ...baseParams, hitsPerPage: 0 };
  }

  const baseFacetFilters = (baseParams.facetFilters as string[][] | undefined) || [];
  const skillFilters = translation.strictSkillFilters.map(
    ({ catalogField, catalogSkill }) => formatFacet(catalogField, catalogSkill),
  );
  const facetFilters = [...baseFacetFilters, skillFilters];

  return { ...baseParams, facetFilters };
};

/**
 * Build parameters for Step 2: Facet-first with TOP-N mapped skills.
 * Relaxes the filter pressure by using only the top-N skills as an OR group.
 */
const buildReducedFacetParams = (
  translation: CatalogTranslation,
  baseParams: SearchOptions,
): SearchOptions => {
  const topSkills = translation.strictSkillFilters?.slice(0, TOP_N_REDUCED_FACETS) ?? [];
  if (!topSkills.length) {
    return { ...baseParams, hitsPerPage: 0 };
  }

  const baseFacetFilters = (baseParams.facetFilters as string[][] | undefined) || [];
  const reducedFilters = topSkills.map(
    ({ catalogField, catalogSkill }) => formatFacet(catalogField, catalogSkill),
  );
  const facetFilters = [...baseFacetFilters, reducedFilters];

  return { ...baseParams, facetFilters };
};

/**
 * Build parameters for Step 3: Text fallback query, no skill filters.
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
 * Retrieval Ladder:
 * 1. Facet-First (All Skills): query='', facetFilters=[ALL mapped skills OR'd] — high precision
 * 2. Facet-First (Top Skills): query='', facetFilters=[TOP-3 mapped skills OR'd] — relaxed
 * 3. Text Fallback:            query=careerTitle, no skill filters — recall-focused
 * 4. Scope Only:               query='', base filters only — always succeeds
 */
export const courseRetrievalService = {
  async fetchCourses(
    translation: CatalogTranslation,
    index: SearchIndex,
  ): Promise<{ courses: CourseCardModel[]; ladderTrace: RetrievalLadderTrace }> {
    const scopedFacetFilters = buildScopedFacetFilters();

    const baseParams: SearchOptions = {
      hitsPerPage: COURSE_RETRIEVAL_LIMIT,
      facetFilters: scopedFacetFilters,
    };

    const attempts: RetrievalLadderAttempt[] = [];

    try {
      // Step 1: Facet-First (All Skills) — query='', all mapped skills as OR facetFilters
      const strictParams = buildStrictParams(translation, baseParams);
      if ((strictParams.hitsPerPage ?? 1) > 0) {
        const strictResponse = await index.search('', strictParams);
        const strictHits = strictResponse.hits?.length ?? 0;
        attempts.push({
          step: 1,
          label: RETRIEVAL_LADDER_STEPS.STRICT,
          query: '',
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

      // Step 2: Facet-First (Top Skills) — query='', top-N skills as OR facetFilters
      const reducedParams = buildReducedFacetParams(translation, baseParams);
      if ((reducedParams.hitsPerPage ?? 1) > 0) {
        const reducedResponse = await index.search('', reducedParams);
        const reducedHits = reducedResponse.hits?.length ?? 0;
        attempts.push({
          step: 2,
          label: RETRIEVAL_LADDER_STEPS.BOOST,
          query: '',
          facetFilters: reducedParams.facetFilters,
          hitCount: reducedHits,
          winner: reducedHits >= MIN_RESULTS_THRESHOLD,
          hits: (reducedResponse.hits || []) as unknown as CourseRetrievalHit[],
        });
        if (reducedHits >= MIN_RESULTS_THRESHOLD) {
          return {
            courses: reducedResponse.hits.map(mapCourseHitToCard),
            ladderTrace: { attempts, winnerStep: 2 },
          };
        }
      }

      // Step 3: Text Fallback — careerTitle (from queryAlternates) and/or translation.query
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

      // Step 4: Scope Only Fallback — empty query, base filters only
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
