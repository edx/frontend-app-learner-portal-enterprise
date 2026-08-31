import type { SearchIndex } from 'algoliasearch/lite';
import { buildCourseCatalogScopeFilters } from './courseCatalogScopeFilters';
import { normalizeString } from './algoliaStrings';
import type { PathwayCourse } from '../state';
import type { CourseRetrievalCatalogScope } from '../types';

/**
 * Raw course record fields consumed from the course catalog Algolia index. Kept private
 * to this service — never exported or returned to callers. Mirrors `courseRetrieval.ts`'s
 * private `CourseHit` shape (snake_case, matching the raw index — never deep-camelCased)
 * plus `advertised_course_run`, which that service never needed.
 */
interface CourseMetadataHit {
  key?: string;
  title?: string;
  partners?: Array<{ name?: string }>;
  level_type?: string;
  advertised_course_run?: { weeks_to_complete?: number };
}

export interface CourseMetadataByKeyInput {
  index: SearchIndex;
  courseKeys: string[];
  catalogScope: CourseRetrievalCatalogScope;
}

/** Trims, drops blanks, and deduplicates while preserving first-seen order. */
const normalizeUnique = (values: string[]): string[] => {
  const seen = new Set<string>();
  const normalized: string[] = [];
  values.forEach((rawValue) => {
    const value = rawValue.trim();
    if (value && !seen.has(value)) {
      seen.add(value);
      normalized.push(value);
    }
  });
  return normalized;
};

/**
 * Formats a course's advertised-run duration only when truthful — a positive, finite
 * week count — omitting it otherwise. No existing mapper in this codebase populates this
 * field today (`courseRetrieval.ts` deliberately never sets `PathwayCourse.length`,
 * since `weeks_to_complete` isn't reliably serialized into this Algolia index), so in
 * practice this will often resolve to `undefined` against real data — that's the correct,
 * truthful outcome, not a bug.
 */
const formatWeeksToComplete = (weeks: unknown): string | undefined => {
  if (typeof weeks !== 'number' || !Number.isFinite(weeks) || weeks <= 0) {
    return undefined;
  }
  return `${weeks} week${weeks === 1 ? '' : 's'}`;
};

/**
 * Maps a raw course hit to the existing `PathwayCourse` domain model. Returns `null` for
 * hits that cannot produce both a non-empty `courseKey` and a non-empty `title`, rather
 * than fabricating placeholder values. Mirrors `courseRetrieval.ts`'s
 * `mapCourseHitToPathwayCourse` field-for-field, adding only `length`.
 */
const mapHitToPathwayCourse = (hit: CourseMetadataHit): PathwayCourse | null => {
  const courseKey = normalizeString(hit.key);
  const title = normalizeString(hit.title);
  if (!courseKey || !title) {
    return null;
  }

  const provider = normalizeString(hit.partners?.[0]?.name);
  const level = normalizeString(hit.level_type);
  const length = formatWeeksToComplete(hit.advertised_course_run?.weeks_to_complete);

  return {
    courseKey,
    title,
    ...(provider ? { provider } : {}),
    ...(level ? { level } : {}),
    ...(length ? { length } : {}),
    status: 'not_started',
  };
};

/**
 * Hydrates an ordered list of eligible course keys (Phase 3's output) into `PathwayCourse[]`
 * via customer-scoped Algolia lookups, one search per key, using the same exact-`hit.key`-
 * match pattern already proven in production by `useCourseFromAlgolia.js` — never a fuzzy
 * first result, never an `objectID` fallback.
 *
 * The caller supplies `index` (e.g. via `getCourseAlgoliaIndex()`) so this service stays
 * hook-free and easy to test. Output order always matches the normalized input key order,
 * regardless of which underlying search settles first — `Promise.all` preserves input
 * order intrinsically. A key with no exact hit, or whose hit lacks a title, is skipped
 * (an ordinary unresolved key, not an error). A search/network rejection for any key
 * rejects the whole call — never a silent partial-success fallback.
 */
export async function fetchCourseMetadataByKeys(
  input: CourseMetadataByKeyInput,
): Promise<PathwayCourse[]> {
  const normalizedKeys = normalizeUnique(input.courseKeys);
  if (normalizedKeys.length === 0) {
    return [];
  }

  const filters = buildCourseCatalogScopeFilters(input.catalogScope);

  const resolved = await Promise.all(normalizedKeys.map(async (courseKey) => {
    const { hits } = await input.index.search<CourseMetadataHit>(courseKey, {
      filters,
      hitsPerPage: 10,
    });
    const exactHit = hits.find((hit) => hit.key === courseKey);
    return exactHit ? mapHitToPathwayCourse(exactHit) : null;
  }));

  return resolved.filter((course): course is PathwayCourse => course !== null);
}
