import { SearchIndex } from 'algoliasearch/lite';
import { SearchOptions } from '@algolia/client-search';
import {
  CourseCardModel,
  CatalogTranslation,
  RetrievalLadderAttempt,
  RetrievalLadderTrace,
  CourseRetrievalHit,
  CatalogSkillMatch,
} from '../types';

import {
  COURSE_RETRIEVAL_LIMIT,
  MIN_RESULTS_THRESHOLD,
  CONTENT_TYPE_COURSE,
  RETRIEVAL_LADDER_STEPS,
} from '../constants';

const formatFacet = (attr: string, value: string) => `${attr}:"${value.replace(/"/g, '\\"')}"`;

const buildScopedFacetFilters = (): string[][] => {
  const override = true;
  const groups: string[][] = [[CONTENT_TYPE_COURSE], override && [
    'enterprise_catalog_query_titles:Subscription',
  ]].filter(Boolean);
  return groups;
};

/**
 * Step 1: Hybrid Broad — query + broad-anchor facetFilters + boost optionalFilters.
 */
const buildHybridBroadParams = (
  translation: CatalogTranslation,
  baseParams: SearchOptions,
): SearchOptions => {
  if (!translation.strictSkillFilters?.length && !translation.boostSkillFilters?.length) {
    return { ...baseParams, hitsPerPage: 0 };
  }

  const baseFacetFilters = (baseParams.facetFilters as string[][] | undefined) || [];
  const skillFilters = translation.strictSkillFilters?.length
    ? translation.strictSkillFilters.map(({ catalogField, catalogSkill }) => formatFacet(catalogField, catalogSkill))
    : undefined;
  const boostFilters = translation.boostSkillFilters?.length
    ? translation.boostSkillFilters.map(({ catalogField, catalogSkill }) => formatFacet(catalogField, catalogSkill))
    : undefined;

  return {
    ...baseParams,
    query: translation.query,
    ...(skillFilters ? { facetFilters: [...baseFacetFilters, skillFilters] } : {}),
    ...(boostFilters ? { optionalFilters: boostFilters } : {}),
  };
};

/**
 * Step 2: Boosted Text — query + boost optionalFilters only, no facetFilters.
 */
const buildBoostedTextParams = (
  translation: CatalogTranslation,
  baseParams: SearchOptions,
): SearchOptions => {
  const query = translation.query || translation.queryAlternates[0] || '';
  if (!query && !translation.boostSkillFilters?.length) {
    return { ...baseParams, hitsPerPage: 0 };
  }

  const boostFilters = translation.boostSkillFilters?.length
    ? translation.boostSkillFilters.map(({ catalogField, catalogSkill }) => formatFacet(catalogField, catalogSkill))
    : undefined;

  return {
    ...baseParams,
    query,
    ...(boostFilters ? { optionalFilters: boostFilters } : {}),
  };
};

/**
 * Step 3+: Text fallback query, no skill filters.
 */
const buildQueryFallbackParams = (
  query: string,
  baseParams: SearchOptions,
): SearchOptions => ({ ...baseParams, query });

/**
 * Lightweight post-retrieval reranker that scores courses by skill overlap and level match.
 */
function rerank(
  hits: any[],
  strictSkillFilters: CatalogSkillMatch[],
  boostSkillFilters: CatalogSkillMatch[],
  learnerLevel?: string,
): any[] {
  if (!strictSkillFilters.length && !boostSkillFilters.length && !learnerLevel) {
    return hits;
  }

  const strictNames = new Set(strictSkillFilters.map((f) => f.catalogSkill.toLowerCase()));
  const boostNames = new Set(boostSkillFilters.map((f) => f.catalogSkill.toLowerCase()));
  const levelOrder: Record<string, number> = { beginner: 0, intermediate: 1, advanced: 2 };

  return hits
    .map((hit, originalIdx) => {
      const hitSkills: string[] = [
        ...(Array.isArray(hit.skill_names) ? hit.skill_names : []),
        ...(Array.isArray(hit['skills.name']) ? hit['skills.name'] : []),
      ].map((s: string) => s.toLowerCase());

      const strictMatches = hitSkills.filter((s) => strictNames.has(s)).length;
      const boostMatches = hitSkills.filter((s) => boostNames.has(s)).length;

      const hitLevel = (hit.level || hit.difficulty || hit.level_type || '').toLowerCase();
      let levelBonus = 0;
      if (learnerLevel && hitLevel) {
        const target = levelOrder[learnerLevel] ?? 1;
        let actual: number;
        if (hitLevel.includes('beginner') || hitLevel.includes('introductory')) {
          actual = 0;
        } else if (hitLevel.includes('intermediate')) {
          actual = 1;
        } else {
          actual = 2;
        }
        const diff = Math.abs(actual - target);
        if (diff === 0) { levelBonus = 2; } else if (diff === 1) { levelBonus = 1; }
      }

      return {
        hit, score: strictMatches * 10 + boostMatches * 3 + levelBonus, originalIdx,
      };
    })
    .sort((a, b) => b.score - a.score || a.originalIdx - b.originalIdx)
    .map(({ hit }) => hit);
}

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
 * 1. Hybrid Broad:    query + broad facetFilters + boost optionalFilters
 * 2. Boosted Text:    query + boost optionalFilters, no facetFilters
 * 3. Career Text:     careerTitle query, no skill filters
 * 4. Scope Only:      empty query, base filters only
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
      // Step 1: Hybrid Broad — query + facetFilters (strict) + optionalFilters (boost)
      const hybridParams = buildHybridBroadParams(translation, baseParams);
      if ((hybridParams.hitsPerPage ?? 1) > 0) {
        const hybridResponse = await index.search(translation.query || '', hybridParams);
        const hybridHits = hybridResponse.hits?.length ?? 0;
        attempts.push({
          step: 1,
          label: RETRIEVAL_LADDER_STEPS.STRICT,
          query: translation.query || '',
          facetFilters: hybridParams.facetFilters,
          optionalFilters: hybridParams.optionalFilters,
          hitCount: hybridHits,
          winner: hybridHits >= MIN_RESULTS_THRESHOLD,
          hits: (hybridResponse.hits || []) as unknown as CourseRetrievalHit[],
        });
        if (hybridHits >= MIN_RESULTS_THRESHOLD) {
          const ranked = rerank(
            hybridResponse.hits,
            translation.strictSkillFilters || [],
            translation.boostSkillFilters || [],
            translation.learnerLevel,
          );
          return {
            courses: ranked.map(mapCourseHitToCard),
            ladderTrace: { attempts, winnerStep: 1 },
          };
        }
      }

      // Step 2: Boosted Text — query + optionalFilters, no skill facetFilters
      const boostedParams = buildBoostedTextParams(translation, baseParams);
      if ((boostedParams.hitsPerPage ?? 1) > 0) {
        const boostedQuery = translation.query || translation.queryAlternates[0] || '';
        const boostedResponse = await index.search(boostedQuery, boostedParams);
        const boostedHits = boostedResponse.hits?.length ?? 0;
        attempts.push({
          step: 2,
          label: RETRIEVAL_LADDER_STEPS.BOOST,
          query: boostedQuery,
          optionalFilters: boostedParams.optionalFilters,
          hitCount: boostedHits,
          winner: boostedHits >= MIN_RESULTS_THRESHOLD,
          hits: (boostedResponse.hits || []) as unknown as CourseRetrievalHit[],
        });
        if (boostedHits >= MIN_RESULTS_THRESHOLD) {
          const ranked = rerank(
            boostedResponse.hits,
            translation.strictSkillFilters || [],
            translation.boostSkillFilters || [],
            translation.learnerLevel,
          );
          return {
            courses: ranked.map(mapCourseHitToCard),
            ladderTrace: { attempts, winnerStep: 2 },
          };
        }
      }

      // Step 3: Text Fallback — careerTitle and/or translation.query
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
