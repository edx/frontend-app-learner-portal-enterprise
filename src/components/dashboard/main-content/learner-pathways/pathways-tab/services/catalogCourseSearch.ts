import type { SearchIndex } from 'algoliasearch/lite';

import type { PathwayCourse } from '../state';

const COURSE_SEARCH_DEFAULT_HITS_PER_PAGE = 5;
const COURSE_SEARCH_MAX_OPTIONAL_SKILLS = 8;
const CONTENT_TYPE_COURSE_FILTER = 'content_type:course';
const METADATA_LANGUAGE_EN_FILTER = 'metadata_language:en';

export interface CourseSearchHitRaw {
  objectID: string;
  key?: string;
  title?: string;
  level_type?: string;
  partners?: Array<{ name?: string }>;
}

export interface CourseSearchOptions {
  index: SearchIndex;
  query: string;
  optionalSkills?: string[];
  hitsPerPage?: number;
}

/**
 * Integration spike (uncommitted): Algolia course search against the enterprise
 * catalog index. The SearchIndex is injected (from useAlgoliaSearch's BFF-secured,
 * catalog-scoped client) rather than built here — this is a real upgrade over the
 * previous session's unsecured, standalone algoliasearch(...) client. Full
 * enterprise-catalog-UUID scoping (enterprise_catalog_query_uuids) is still out of
 * scope for this spike; see the productionization doc.
 */
export async function searchLearnerPathwaysCourses(
  {
    index, query, optionalSkills = [], hitsPerPage = COURSE_SEARCH_DEFAULT_HITS_PER_PAGE,
  }: CourseSearchOptions,
): Promise<CourseSearchHitRaw[]> {
  const optionalFilters = optionalSkills
    .slice(0, COURSE_SEARCH_MAX_OPTIONAL_SKILLS)
    .map((skill) => `skill_names:"${skill}"`);
  const { hits } = await index.search<CourseSearchHitRaw>(query, {
    hitsPerPage,
    page: 0,
    facetFilters: [[CONTENT_TYPE_COURSE_FILTER], [METADATA_LANGUAGE_EN_FILTER]],
    ...(optionalFilters.length ? { optionalFilters } : {}),
  });
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
