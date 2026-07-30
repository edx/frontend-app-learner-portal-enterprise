import type { SearchIndex } from 'algoliasearch/lite';
import { AlgoliaFilterBuilder } from '../../../../../AlgoliaFilterBuilder';
import { catalogFacetService } from './catalogFacetService';
import { translateSkillsToCatalog } from './catalogSkillTranslation';
import type { CatalogSkillMatch } from './catalogSkillTranslation';
import { normalizeString } from './algoliaStrings';
import type { PathwayCourse } from '../state';
import type { CareerSearchLearnerLevel, CourseSearchOptions } from '../types';

/** Maximum number of course hits requested per retrieval-ladder search. */
const COURSE_RETRIEVAL_LIMIT = 10;
/** Minimum valid, mapped, deduplicated course count required for a ladder step to win. */
const MIN_VALID_COURSE_RESULTS = 3;
/** Maximum number of courses returned after reranking. */
const MAX_COURSE_RECOMMENDATIONS = 5;

/**
 * Fixed scope constraint for every ladder search: course content only. Catalog/tenant
 * scoping is no longer built here — it's enforced server-side by the secured Algolia API
 * key the injected `index` is resolved with (see `usePathwaysController`), so this never
 * varies per call and needs no per-call construction.
 */
const BASE_SCOPE_FACET_FILTERS = [AlgoliaFilterBuilder.facetEntry('content_type', 'course')];

/** Learner-level rank used for the rerank level-compatibility bonus. */
const LEVEL_RANK: Record<string, number> = {
  introductory: 0,
  intermediate: 1,
  advanced: 2,
};

/**
 * Raw course record fields consumed from the course catalog Algolia index. Kept private
 * to this service — never exported or returned to callers.
 */
interface CourseHit {
  key?: string;
  title?: string;
  partners?: Array<{ name?: string }>;
  level_type?: string;
  skill_names?: string[];
  'skills.name'?: string[];
}

/**
 * Builds the strict skills OR-group as a `facetFilters` nested group: a matched group
 * can span two different catalog fields (`skill_names`/`skills.name`), which is why
 * this maps each match independently rather than using a single-attribute helper.
 */
const buildStrictFacetGroup = (strictSkillFilters: CatalogSkillMatch[]): string[] | undefined => (
  strictSkillFilters.length
    ? strictSkillFilters.map(
      ({ catalogField, catalogSkill }) => AlgoliaFilterBuilder.facetEntry(catalogField, catalogSkill),
    )
    : undefined
);

const buildBoostOptionalFilters = (boostSkillFilters: CatalogSkillMatch[]): string[] | undefined => (
  boostSkillFilters.length
    ? boostSkillFilters.map(
      ({ catalogField, catalogSkill }) => AlgoliaFilterBuilder.facetEntry(catalogField, catalogSkill),
    )
    : undefined
);

/**
 * Maps a raw course hit to the existing `PathwayCourse` domain model. Returns `null` for
 * hits that cannot produce both a non-empty `courseKey` and a non-empty `title`, rather
 * than fabricating placeholder values or falling back to `objectID`. `courseKey` comes
 * from `hit.key` only — confirmed the real, production join field via
 * `useCourseFromAlgolia.js`'s `hits.find(hit => hit.key === courseKey)`.
 */
const mapCourseHitToPathwayCourse = (hit: CourseHit): PathwayCourse | null => {
  const courseKey = normalizeString(hit.key);
  const title = normalizeString(hit.title);

  if (!courseKey || !title) {
    return null;
  }

  const provider = normalizeString(hit.partners?.[0]?.name);
  const level = normalizeString(hit.level_type);

  return {
    courseKey,
    title,
    ...(provider ? { provider } : {}),
    ...(level ? { level } : {}),
    status: 'not_started',
  };
};

interface MappedCourseHit {
  hit: CourseHit;
  course: PathwayCourse;
}

/**
 * Maps and deduplicates raw hits by `courseKey`, first occurrence wins. Relative order
 * of survivors is preserved, which doubles as the original-Algolia-rank tiebreak input
 * for `rerank`.
 */
const mapAndDedupeHits = (hits: CourseHit[]): MappedCourseHit[] => {
  const seenCourseKeys = new Set<string>();
  const mapped: MappedCourseHit[] = [];

  hits.forEach((hit) => {
    const course = mapCourseHitToPathwayCourse(hit);
    if (course && !seenCourseKeys.has(course.courseKey)) {
      seenCourseKeys.add(course.courseKey);
      mapped.push({ hit, course });
    }
  });

  return mapped;
};

/**
 * Reranks a step's valid, deduplicated course hits by skill overlap and learner-level
 * compatibility, then caps the result at `MAX_COURSE_RECOMMENDATIONS`.
 *
 * Scoring: each matched strict skill contributes 10 points, each matched boost skill
 * contributes 3 points, an exact learner-level match adds 2 points, an adjacent level
 * adds 1 point. Ties break on original Algolia order (survivor order in `mappedHits`).
 */
const rerank = (
  mappedHits: MappedCourseHit[],
  strictSkillFilters: CatalogSkillMatch[],
  boostSkillFilters: CatalogSkillMatch[],
  learnerLevel?: CareerSearchLearnerLevel,
): PathwayCourse[] => {
  const strictNames = new Set(strictSkillFilters.map((f) => f.catalogSkill.toLowerCase()));
  const boostNames = new Set(boostSkillFilters.map((f) => f.catalogSkill.toLowerCase()));

  const scored = mappedHits.map(({ hit, course }, index) => {
    const hitSkills = [
      ...(hit.skill_names ?? []),
      ...(hit['skills.name'] ?? []),
    ].map((skill) => skill.toLowerCase());

    const strictOverlap = hitSkills.filter((skill) => strictNames.has(skill)).length;
    const boostOverlap = hitSkills.filter((skill) => boostNames.has(skill)).length;

    let levelBonus = 0;
    const hitLevel = normalizeString(hit.level_type).toLowerCase();
    if (learnerLevel && hitLevel) {
      // LEVEL_RANK covers every current CareerSearchLearnerLevel value, so this is
      // unreachable today — kept as a guard against the union type gaining a member
      // without a matching LEVEL_RANK entry.
      const targetRank = LEVEL_RANK[learnerLevel] ?? 1;
      let actualRank = 0;
      if (hitLevel.includes('intermediate')) {
        actualRank = 1;
      } else if (hitLevel.includes('advanced')) {
        actualRank = 2;
      }
      const diff = Math.abs(actualRank - targetRank);
      if (diff === 0) {
        levelBonus = 2;
      } else if (diff === 1) {
        levelBonus = 1;
      }
    }

    return {
      course,
      index,
      score: (strictOverlap * 10) + (boostOverlap * 3) + levelBonus,
    };
  });

  return scored
    .sort((a, b) => (b.score - a.score) || (a.index - b.index))
    .slice(0, MAX_COURSE_RECOMMENDATIONS)
    .map(({ course }) => course);
};

/**
 * Service for retrieving and ranking learner pathway courses from the Algolia course
 * catalog index, via a progressive retrieval ladder that widens constraints until enough
 * relevant results are found. Unlike the AI Pathways prototype this is ported from, the
 * ladder has no unconditional final "Scope Only" fallback — an exhausted ladder returns
 * `[]` rather than generic, relevance-free courses.
 */
export const courseRetrievalService = {
  /**
   * Executes the retrieval ladder and returns the winning, reranked course set.
   *
   * Ladder:
   * 1. **Hybrid Broad** — skipped when there's no real query *and* no strict skill
   *    group (boost skills alone are never enough to run this step — see below).
   *    Otherwise: query, base scope `facetFilters` plus a nested strict-skills OR-group,
   *    boost `optionalFilters`.
   * 2. **Boosted Text** — only if Step 1 didn't reach `MIN_VALID_COURSE_RESULTS`. Query,
   *    base scope `facetFilters` only (no strict group), boost `optionalFilters` only.
   * 3. **Career Text** — only if Step 2 didn't reach the threshold. Iterates
   *    `[query, ...queryAlternates]` sequentially, base scope `facetFilters` only, no
   *    skill filters, stopping at the first sufficient result.
   *
   * Step 1 requires a real query *or* a real strict skill group before it runs — an
   * empty query with only boost (optional) skills is never enough on its own, since
   * every in-scope course would be eligible with nothing actually filtering it out.
   * When Step 1 is skipped or insufficient, execution falls through to Step 2 exactly
   * as it already does for any other insufficient step.
   *
   * "Sufficient" is evaluated on the valid, mapped, deduplicated course count for that
   * step — not the raw hit count. Errors propagate uncaught.
   *
   * @param index The configured, secured (catalog-scoped) Algolia `SearchIndex` for the
   * course catalog.
   * @param options Selected career and normalized search intent.
   * @returns The winning step's reranked `PathwayCourse[]`, or `[]` if the ladder is exhausted.
   */
  async searchCourses(index: SearchIndex, options: CourseSearchOptions): Promise<PathwayCourse[]> {
    const facetSnapshot = await catalogFacetService.getFacetSnapshot(index);
    const translation = translateSkillsToCatalog(options, facetSnapshot);
    const { learnerLevel } = options.intent;

    const strictFacetGroup = buildStrictFacetGroup(translation.strictSkillFilters);
    const shouldAttemptHybridBroad = Boolean(translation.query) || Boolean(strictFacetGroup);

    if (shouldAttemptHybridBroad) {
      const facetFilters = strictFacetGroup
        ? [...BASE_SCOPE_FACET_FILTERS, strictFacetGroup]
        : BASE_SCOPE_FACET_FILTERS;
      const optionalFilters = buildBoostOptionalFilters(translation.boostSkillFilters);

      const searchParams: Record<string, unknown> = { hitsPerPage: COURSE_RETRIEVAL_LIMIT, facetFilters };
      if (optionalFilters) {
        searchParams.optionalFilters = optionalFilters;
      }

      const response = await index.search<CourseHit>(translation.query, searchParams);
      const mappedHits = mapAndDedupeHits(response.hits);
      if (mappedHits.length >= MIN_VALID_COURSE_RESULTS) {
        return rerank(mappedHits, translation.strictSkillFilters, translation.boostSkillFilters, learnerLevel);
      }
    }

    {
      const optionalFilters = buildBoostOptionalFilters(translation.boostSkillFilters);
      const searchParams: Record<string, unknown> = {
        hitsPerPage: COURSE_RETRIEVAL_LIMIT,
        facetFilters: BASE_SCOPE_FACET_FILTERS,
      };
      if (optionalFilters) {
        searchParams.optionalFilters = optionalFilters;
      }

      const response = await index.search<CourseHit>(translation.query, searchParams);
      const mappedHits = mapAndDedupeHits(response.hits);
      if (mappedHits.length >= MIN_VALID_COURSE_RESULTS) {
        return rerank(mappedHits, translation.strictSkillFilters, translation.boostSkillFilters, learnerLevel);
      }
    }

    const queries = [translation.query, ...translation.queryAlternates].filter(Boolean);
    for (let i = 0; i < queries.length; i += 1) {
      const query = queries[i];
      const searchParams = { hitsPerPage: COURSE_RETRIEVAL_LIMIT, facetFilters: BASE_SCOPE_FACET_FILTERS };
      // eslint-disable-next-line no-await-in-loop
      const response = await index.search<CourseHit>(query, searchParams);
      const mappedHits = mapAndDedupeHits(response.hits);
      if (mappedHits.length >= MIN_VALID_COURSE_RESULTS) {
        return rerank(mappedHits, translation.strictSkillFilters, translation.boostSkillFilters, learnerLevel);
      }
    }

    return [];
  },
};
