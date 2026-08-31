import type { SearchIndex } from 'algoliasearch/lite';
import { catalogFacetService } from './catalogFacetService';
import { groundSkillNames } from './catalogSkillTranslation';
import { buildCourseCatalogScopeFilters } from './courseCatalogScopeFilters';
import {
  buildBoostOptionalFilters, mapAndDedupeHits, rerank,
} from './courseRetrieval';
import type { CourseHit } from './courseRetrieval';
import type { LearnerSkillFallback } from './directCourseKeyRetrieval';
import type { PathwayCourse } from '../state';
import type { CourseRetrievalCatalogScope } from '../types';

/** Maximum number of grounded boost skills sent as optionalFilters (`boostCount` in the validated config). */
const MAX_BOOST_SKILLS = 8;
/** Algolia `hitsPerPage` for the single retrieval call (`candidatePool` in the validated config). */
const CANDIDATE_POOL = 10;
/** Maximum number of whitespace-separated terms kept from `condensedAlgoliaQuery` (`queryTermCap`). */
const MAX_QUERY_TERMS = 3;

export interface CourseSkillFallbackRetrievalInput {
  index: SearchIndex;
  fallback: LearnerSkillFallback;
  catalogScope: CourseRetrievalCatalogScope;
}

/** Caps `text` to its first `cap` whitespace-separated terms. */
const capQueryTerms = (text: string, cap: number): string => (
  text.trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, cap)
    .join(' ')
);

/**
 * Retrieves courses for the Algolia skills fallback branch of direct-mode pathway
 * generation, using the single-search retrieval approach cross-validated in the
 * `learner-pathways-analysis` tuning workspace: one Algolia call, no hard skill filter
 * (`optional-only`), boost-only skill signals, and a condensed-intent query capped to
 * its first `MAX_QUERY_TERMS` terms. This deliberately does not reuse
 * `courseRetrievalService.searchCourses`'s 3-step career-flow ladder — that ladder is a
 * different, career-flow-specific algorithm this validated config outperformed.
 *
 * Skill grounding, hit mapping/deduplication, and reranking are reused from
 * `catalogSkillTranslation`/`courseRetrieval` rather than reimplemented; `rerank` already
 * caps its output, so no additional slicing happens here or in the caller.
 */
export async function searchCoursesBySkillFallback(
  input: CourseSkillFallbackRetrievalInput,
): Promise<PathwayCourse[]> {
  const { index, fallback, catalogScope } = input;

  const facetSnapshot = await catalogFacetService.getFacetSnapshot(index, catalogScope);
  const groundedSkills = groundSkillNames(
    [...fallback.skillsRequired, ...fallback.skillsPreferred],
    facetSnapshot,
  ).slice(0, MAX_BOOST_SKILLS);

  const query = capQueryTerms(fallback.condensedAlgoliaQuery, MAX_QUERY_TERMS);
  const filters = buildCourseCatalogScopeFilters(catalogScope);
  const optionalFilters = buildBoostOptionalFilters(groundedSkills);

  const searchParams: Record<string, unknown> = { hitsPerPage: CANDIDATE_POOL, filters };
  if (optionalFilters) {
    searchParams.optionalFilters = optionalFilters;
  }

  const response = await index.search<CourseHit>(query, searchParams);
  const mappedHits = mapAndDedupeHits(response.hits);

  return rerank(mappedHits, [], groundedSkills, fallback.learnerLevel);
}
