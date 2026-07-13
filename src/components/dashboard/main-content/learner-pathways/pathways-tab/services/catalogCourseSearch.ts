import type { SearchIndex } from 'algoliasearch/lite';
import { getConfig } from '@edx/frontend-platform/config';

import type { PathwayCourse } from '../state';

const COURSE_RETRIEVAL_LIMIT = 5;
const MIN_RESULTS_THRESHOLD = 3;
const MAX_STRICT_SKILLS = 4;
const MAX_BOOST_SKILLS = 8;
const CONTENT_TYPE_COURSE_FILTER = 'content_type:course';
const METADATA_LANGUAGE_EN_FILTER = 'metadata_language:en';
const ENTERPRISE_CATALOG_QUERY_TITLES_SUBSCRIPTION_FILTER = 'enterprise_catalog_query_titles:Subscription';

const formatSkillFacet = (skill: string) => `skill_names:"${skill.replace(/"/g, '\\"')}"`;

const buildScopedFacetFilters = (isReferencedCatalogActive: boolean): string[][] => [
  [CONTENT_TYPE_COURSE_FILTER],
  ...(isReferencedCatalogActive ? [[ENTERPRISE_CATALOG_QUERY_TITLES_SUBSCRIPTION_FILTER]] : []),
  [METADATA_LANGUAGE_EN_FILTER],
];

export interface CourseSearchHitRaw {
  objectID: string;
  key?: string;
  title?: string;
  level_type?: string;
  partners?: Array<{ name?: string }>;
  skill_names?: string[];
}

export interface CourseSearchOptions {
  index: SearchIndex;
  query: string;
  queryAlternates?: string[];
  strictSkills?: string[];
  boostSkills?: string[];
}

/**
 * Reranks hits by skill-match count: a strict-skill match is worth 10 points,
 * a boost-skill match 3 points, matching ai-pathways' rerank scoring. Ties
 * broken by original (Algolia) rank, ascending, for stability. A no-op
 * passthrough when there's no skill signal at all. Deliberately does not
 * port ai-pathways' learnerLevel bonus — no such concept exists in
 * OnboardingAnswers/LearningIntentResponse/CareerMatch in this codebase.
 */
function rerank(
  hits: CourseSearchHitRaw[],
  strictSkills: string[],
  boostSkills: string[],
): CourseSearchHitRaw[] {
  if (!strictSkills.length && !boostSkills.length) {
    return hits;
  }

  const strictSet = new Set(strictSkills.map((skill) => skill.toLowerCase()));
  const boostSet = new Set(boostSkills.map((skill) => skill.toLowerCase()));

  return hits
    .map((hit, originalIndex) => {
      const hitSkills = Array.isArray(hit.skill_names)
        ? hit.skill_names.map((skill) => skill.toLowerCase())
        : [];
      const strictMatches = hitSkills.filter((skill) => strictSet.has(skill)).length;
      const boostMatches = hitSkills.filter((skill) => boostSet.has(skill)).length;
      return { hit, originalIndex, score: (strictMatches * 10) + (boostMatches * 3) };
    })
    .sort((a, b) => b.score - a.score || a.originalIndex - b.originalIndex)
    .map(({ hit }) => hit);
}

/**
 * Integration spike (uncommitted): Algolia course search against the enterprise
 * catalog index. The SearchIndex is injected by the caller — either the
 * production BFF-secured/catalog-scoped useAlgoliaSearch client, or, when the
 * ai-pathways-style ALGOLIA_STAGE_*_OVERRIDE credentials are configured, a
 * client pointed at a real prod Algolia app for realistic demo data (see
 * hooks/useCatalogAlgoliaSearch.ts). When that override is active, an
 * enterprise_catalog_query_titles:Subscription facet is added as the same
 * coarse "referenced enterprise customer catalog" scope ai-pathways uses —
 * this is a fixed stand-in reference, not real per-learner catalog-UUID
 * scoping (enterprise_catalog_query_uuids), which remains out of scope for
 * this spike; see the productionization doc.
 *
 * Ported from ai-pathways' proven 4-step retrieval ladder
 * (services/courseRetrieval.ts), each step gated on MIN_RESULTS_THRESHOLD
 * and capped at COURSE_RETRIEVAL_LIMIT hits:
 *   1. Hybrid Broad — query + strict skills as a hard facetFilters group
 *      (capped at MAX_STRICT_SKILLS) + boost skills as optionalFilters
 *      (capped at MAX_BOOST_SKILLS). Skipped entirely when there's no skill
 *      signal at all. Reranked on a win.
 *   2. Boosted Text Fallback — query (or the first query alternate) with
 *      only optionalFilters, no strict facet group. Reranked on a win.
 *   3. Career Text Fallback — sequentially tries [query, ...queryAlternates]
 *      with base scope facets only, no skill filters, no rerank.
 *   4. Scope Only Fallback — empty query, base scope facets only; always
 *      the winner regardless of hit count (no threshold, no rerank) — the
 *      guaranteed last resort.
 *
 * Deliberate deviations from ai-pathways: no top-level try/catch (errors
 * propagate — a real Algolia outage must not be silently reported as "zero
 * courses found", per generatePathwayWorkflow's existing error-propagation
 * contract); no ladderTrace/attempts bookkeeping (no DebugConsole consumer
 * here); no dual skill_names/skills.name catalog-field matching (single
 * field only); no taxonomy-derived skill-tiering pipeline (Learning Intent
 * already returns a clean required/preferred split, no raw signal list to
 * tier); no learnerLevel rerank bonus (no such field exists here).
 */
export async function searchLearnerPathwaysCourses(
  {
    index, query, queryAlternates = [], strictSkills = [], boostSkills = [],
  }: CourseSearchOptions,
): Promise<CourseSearchHitRaw[]> {
  const config = getConfig();
  const isReferencedCatalogActive = Boolean(
    config.ALGOLIA_STAGE_APP_ID_OVERRIDE && config.ALGOLIA_STAGE_SEARCH_API_KEY_OVERRIDE,
  );

  const cappedStrictSkills = strictSkills.slice(0, MAX_STRICT_SKILLS);
  const cappedBoostSkills = boostSkills.slice(0, MAX_BOOST_SKILLS);
  const strictSkillFacets = cappedStrictSkills.map(formatSkillFacet);
  const boostSkillFacets = cappedBoostSkills.map(formatSkillFacet);

  const baseFacetFilters = buildScopedFacetFilters(isReferencedCatalogActive);
  const baseParams = { hitsPerPage: COURSE_RETRIEVAL_LIMIT, page: 0, facetFilters: baseFacetFilters };

  // Step 1: Hybrid Broad.
  if (strictSkillFacets.length || boostSkillFacets.length) {
    const { hits } = await index.search<CourseSearchHitRaw>(query, {
      ...baseParams,
      ...(strictSkillFacets.length ? { facetFilters: [...baseFacetFilters, strictSkillFacets] } : {}),
      ...(boostSkillFacets.length ? { optionalFilters: boostSkillFacets } : {}),
    });
    if (hits.length >= MIN_RESULTS_THRESHOLD) {
      return rerank(hits, cappedStrictSkills, cappedBoostSkills);
    }
  }

  // Step 2: Boosted Text Fallback.
  const boostedTextQuery = query || queryAlternates[0] || '';
  if (boostedTextQuery || boostSkillFacets.length) {
    const { hits } = await index.search<CourseSearchHitRaw>(boostedTextQuery, {
      ...baseParams,
      ...(boostSkillFacets.length ? { optionalFilters: boostSkillFacets } : {}),
    });
    if (hits.length >= MIN_RESULTS_THRESHOLD) {
      return rerank(hits, cappedStrictSkills, cappedBoostSkills);
    }
  }

  // Step 3: Career Text Fallback — sequential by design, short-circuits on the first winner.
  const textCandidates = [query, ...queryAlternates].filter(Boolean);
  // eslint-disable-next-line no-restricted-syntax
  for (const candidateQuery of textCandidates) {
    // eslint-disable-next-line no-await-in-loop
    const { hits } = await index.search<CourseSearchHitRaw>(candidateQuery, baseParams);
    if (hits.length >= MIN_RESULTS_THRESHOLD) {
      return hits;
    }
  }

  // Step 4: Scope Only Fallback — always the winner, no threshold gate.
  const { hits } = await index.search<CourseSearchHitRaw>('', baseParams);
  return hits;
}

/**
 * courseKey maps directly from hit.key with NO `?? objectID` fallback — unlike the
 * previous session's course-search-only spike, this course list feeds Recommendation
 * Feedback, which needs a real stable catalog key. A missing key here is a workflow-
 * level concern (generatePathwayWorkflow drops the course and logs it), not something
 * this mapper should paper over by substituting objectID.
 */
export function mapAlgoliaHitToPathwayCourse(hit: CourseSearchHitRaw): PathwayCourse {
  return {
    id: hit.objectID,
    courseKey: hit.key,
    title: hit.title ?? '',
    provider: hit.partners?.[0]?.name,
    level: hit.level_type,
    status: 'not_started',
  };
}
