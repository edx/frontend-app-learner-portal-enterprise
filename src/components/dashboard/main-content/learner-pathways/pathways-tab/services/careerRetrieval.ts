import type { SearchIndex } from 'algoliasearch/lite';
import { AlgoliaFilterBuilder } from '../../../../../AlgoliaFilterBuilder';
import { careerFacetService } from './careerFacetService';
import { translateCareerSkillsToCatalog } from './careerSkillTranslation';
import type { CatalogSkillMatch } from './catalogSkillTranslation';
import { normalizeString } from './algoliaStrings';
import type { CareerMatch } from '../state';
import type { CareerSearchIntent } from '../types';

/** Maximum number of career taxonomy hits requested per search. */
const CAREER_RETRIEVAL_LIMIT = 10;

const FACET_FIELDS = {
  INDUSTRY_NAMES: 'industry_names',
  JOB_SOURCES: 'job_sources',
  SKILLS_DOT_NAME: 'skills.name',
} as const;

/**
 * Raw taxonomy record fields consumed from the career/taxonomy Algolia index. Kept
 * private to this service — never exported or returned to callers.
 */
interface TaxonomyCareerHit {
  id?: string | number;
  objectID?: string;
  name?: string;
  skills?: Array<{ name?: string }>;
}

const dedupeStrings = (values: Array<string | undefined | null>): string[] => (
  Array.from(new Set(values.map(normalizeString).filter(Boolean)))
);

const buildOptionalSkillFilter = (skill: string, score?: number): string => {
  const entry = AlgoliaFilterBuilder.facetEntry(FACET_FIELDS.SKILLS_DOT_NAME, skill);
  return score ? `${entry}<score=${score}>` : entry;
};

/**
 * Derives the primary search query for the taxonomy search: the AI-generated condensed
 * query first, falling back to the first normalized role or required skill.
 */
const buildCareerQuery = (intent: CareerSearchIntent): string => {
  const condensedQuery = normalizeString(intent.condensedAlgoliaQuery);

  if (condensedQuery) {
    return condensedQuery;
  }

  const fallbackTerms = dedupeStrings([...(intent.roles ?? []), ...intent.skillsRequired]);
  return fallbackTerms[0] || '';
};

/**
 * Builds the industry/job-source/exclude-tag hard `facetFilters` entries: industries and
 * job sources each become their own nested OR-group (a record must match at least one
 * value in each present group); each excluded tag becomes its own top-level,
 * independently-negated entry (every exclusion must hold). Returns `[]` when none apply —
 * the grounded strict-skill group (built separately, see `buildStrictSkillGroup`) is
 * appended to this by the caller.
 */
const buildIndustryJobExcludeFilters = (intent: CareerSearchIntent): (string | string[])[] => {
  const industries = dedupeStrings(intent.industries ?? []);
  const jobSources = dedupeStrings(intent.jobSources ?? []);
  const excludeTags = dedupeStrings(intent.excludeTags ?? []);

  const entries: (string | string[])[] = [];

  if (industries.length) {
    entries.push(industries.map((industry) => AlgoliaFilterBuilder.facetEntry(FACET_FIELDS.INDUSTRY_NAMES, industry)));
  }

  if (jobSources.length) {
    entries.push(jobSources.map((jobSource) => AlgoliaFilterBuilder.facetEntry(FACET_FIELDS.JOB_SOURCES, jobSource)));
  }

  excludeTags.forEach((tag) => {
    entries.push(AlgoliaFilterBuilder.facetEntry(FACET_FIELDS.SKILLS_DOT_NAME, tag, { negate: true }));
  });

  return entries;
};

/**
 * Builds the grounded strict-skill `facetFilters` nested OR-group (a record must match at
 * least one broad/required skill), mirroring course retrieval's `buildStrictFacetGroup`.
 * Returns `undefined` when no strict skills survived grounding/classification.
 */
const buildStrictSkillGroup = (strictSkillFilters: CatalogSkillMatch[]): string[] | undefined => (
  strictSkillFilters.length
    ? strictSkillFilters.map(
      ({ catalogField, catalogSkill }) => AlgoliaFilterBuilder.facetEntry(catalogField, catalogSkill),
    )
    : undefined
);

/**
 * Builds Algolia `optionalFilters` (soft-boosting) from the grounded, classified boost
 * (narrow/preferred) skills, each scored `<score=1>` — matching the pre-existing
 * preferred-skill weighting. Returns `undefined` when there are none.
 */
const buildBoostOptionalFilters = (boostSkillFilters: CatalogSkillMatch[]): string[] | undefined => (
  boostSkillFilters.length
    ? boostSkillFilters.map(({ catalogSkill }) => buildOptionalSkillFilter(catalogSkill, 1))
    : undefined
);

/**
 * Maps a raw taxonomy hit to the existing `CareerMatch` domain model. Returns `null`
 * for hits that cannot produce both a non-empty identifier and a non-empty title,
 * rather than fabricating placeholder values. `matchPercentage` and `laborMarketTrend`
 * are always omitted — no verified compatible domain value exists for them yet.
 */
const mapTaxonomyHitToCareerMatch = (hit: TaxonomyCareerHit): CareerMatch | null => {
  const id = normalizeString(String(hit.id ?? hit.objectID ?? ''));
  const title = normalizeString(hit.name);

  if (!id || !title) {
    return null;
  }

  const skillsToDevelop = dedupeStrings((hit.skills || []).map((skill) => skill.name));

  return {
    id,
    title,
    ...(skillsToDevelop.length ? { skillsToDevelop } : {}),
  };
};

const mapHitsToCareerMatches = (hits: TaxonomyCareerHit[]): CareerMatch[] => hits
  .map(mapTaxonomyHitToCareerMatch)
  .filter((careerMatch): careerMatch is CareerMatch => careerMatch !== null);

/**
 * Service for career retrieval from the Algolia career/taxonomy index. Transforms a
 * normalized `CareerSearchIntent` into a progressively loosened sequence of taxonomy
 * searches, stopping at the first that returns any real match.
 */
export const careerRetrievalService = {
  /**
   * Queries the given career/taxonomy index for roles matching the learner's intent,
   * retrying with progressively loosened search parameters when a step returns zero
   * matches, then maps the winning step's raw hits into `CareerMatch[]`. The configured
   * index must be injected by the caller.
   *
   * Required/broad skills are classified as strict (a nested `facetFilters` OR-group,
   * alongside any industry/job-source/exclude-tag entries) and preferred/narrow skills as
   * boost (`optionalFilters`), grounded against a real facet snapshot of the career/
   * taxonomy index's `skills.name` vocabulary — mirroring course retrieval's strict/boost
   * split exactly, via the shared `classifySkillSignals` mechanism.
   *
   * Ladder (each step only runs if it would differ from the ones before it):
   * 1. Strict + Boost + Query — every available signal. Requires a real query *or* a
   *    real strict `facetFilters` group before it runs — an empty query with only boost
   *    (optional) filters is never enough on its own, since nothing would actually
   *    constrain the search. When skipped, execution falls through to Step 2 exactly as
   *    it already does for any other insufficient step.
   * 2. Strict + Boost — drops the query, keeps both facet tiers.
   * 3. Boost Only — drops the strict (hard) filter too, keeping only the soft boost.
   * 4. Query Only — last resort, no facets of any kind.
   *
   * @param index The configured Algolia `SearchIndex` for the career/taxonomy catalog.
   * @param intent The normalized search intent.
   * @returns The mapped career matches from the first successful step, in Algolia result
   * order, or `[]` once the ladder is exhausted.
   */
  async searchCareers(index: SearchIndex, intent: CareerSearchIntent): Promise<CareerMatch[]> {
    const facetSnapshot = await careerFacetService.getFacetSnapshot(index);
    const { strictSkillFilters, boostSkillFilters } = translateCareerSkillsToCatalog(intent, facetSnapshot);

    const query = buildCareerQuery(intent);
    const industryJobExcludeFilters = buildIndustryJobExcludeFilters(intent);
    const strictSkillGroup = buildStrictSkillGroup(strictSkillFilters);
    const facetFilterEntries = strictSkillGroup
      ? [...industryJobExcludeFilters, strictSkillGroup]
      : industryJobExcludeFilters;
    const facetFilters = facetFilterEntries.length ? facetFilterEntries : undefined;
    const optionalFilters = buildBoostOptionalFilters(boostSkillFilters);

    // STEP 1 — Strict + Boost + Query: every available signal, but skipped for the one
    // combination that would search on optional boost filters alone with nothing to
    // actually constrain the results: no query and no strict facet group.
    if (query || facetFilters || !optionalFilters) {
      const searchParams: Record<string, unknown> = { hitsPerPage: CAREER_RETRIEVAL_LIMIT };
      if (facetFilters) { searchParams.facetFilters = facetFilters; }
      if (optionalFilters) { searchParams.optionalFilters = optionalFilters; }

      const response = await index.search<TaxonomyCareerHit>(query, searchParams);
      const matches = mapHitsToCareerMatches(response.hits);
      if (matches.length > 0) {
        return matches;
      }
    }

    // STEP 2 — Strict + Boost: drop the query, keep both facet tiers. Only meaningful if
    // there was a query to drop and at least one facet tier to fall back on.
    if (query && (facetFilters || optionalFilters)) {
      const searchParams: Record<string, unknown> = { hitsPerPage: CAREER_RETRIEVAL_LIMIT };
      if (facetFilters) { searchParams.facetFilters = facetFilters; }
      if (optionalFilters) { searchParams.optionalFilters = optionalFilters; }

      const response = await index.search<TaxonomyCareerHit>('', searchParams);
      const matches = mapHitsToCareerMatches(response.hits);
      if (matches.length > 0) {
        return matches;
      }
    }

    // STEP 3 — Boost Only: drop the strict (hard) filter too, keeping only the soft
    // boost. Runs whenever there's a boost to fall back on, unless it would exactly
    // repeat Step 2 (query was truthy and there was never a strict facet to drop, so
    // Step 2 already degenerated into this same boost-only, empty-query request).
    if (optionalFilters && (facetFilters || !query)) {
      const response = await index.search<TaxonomyCareerHit>('', {
        hitsPerPage: CAREER_RETRIEVAL_LIMIT,
        optionalFilters,
      });
      const matches = mapHitsToCareerMatches(response.hits);
      if (matches.length > 0) {
        return matches;
      }
    }

    // STEP 4 — Query Only: last resort, no facets of any kind. Only meaningful if step 1
    // actually had a facet to drop — otherwise step 1 already was this exact case.
    if (facetFilters || optionalFilters) {
      const response = await index.search<TaxonomyCareerHit>(query, { hitsPerPage: CAREER_RETRIEVAL_LIMIT });
      return mapHitsToCareerMatches(response.hits);
    }

    return [];
  },
};
