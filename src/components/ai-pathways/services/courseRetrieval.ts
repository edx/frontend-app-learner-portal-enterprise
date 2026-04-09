import { SearchIndex } from 'algoliasearch/lite';
import AlgoliaFilterBuilder from '../../AlgoliaFilterBuilder/AlgoliaFilterBuilder';
import {
  FacetBootstrapContext,
  CourseCardModel,
} from '../types';

const DEFAULT_HITS_PER_PAGE = 5;
const MAX_STRICT_SKILLS = 8;
const MAX_OPTIONAL_SKILLS = 12;

const normalizeString = (value?: string | null): string => (value || '').trim();

const isNonEmptyString = (value?: string | null): value is string => Boolean(normalizeString(value));

const quoteFacetValue = (value: string): string => `"${value.replace(/"/g, '\\"')}"`;

const dedupeStrings = (values: Array<string | undefined | null>): string[] => {
  const seen = new Set<string>();

  return values
    .map(normalizeString)
    .filter(Boolean)
    .filter((value) => {
      if (seen.has(value)) {
        return false;
      }

      seen.add(value);
      return true;
    });
};

const buildScopedFilters = (context: FacetBootstrapContext): string | undefined => {
  const builder = new AlgoliaFilterBuilder();

  if (context.locale) {
    builder.filterByMetadataLanguage(context.locale);
  }

  builder.and('content_type', 'course');

  const builtFilters = builder.build();

  return isNonEmptyString(builtFilters) ? builtFilters : undefined;
};

const buildStrictSkillFacetFilters = (skills: string[]): string[][] | undefined => {
  if (!skills.length) {
    return undefined;
  }

  // One OR group: match any of these skills.
  return [skills.map((skill) => `skill_names:${skill}`)];
};

const buildOptionalSkillFilters = (skills: string[]): string[] | undefined => {
  if (!skills.length) {
    return undefined;
  }

  return skills.map((skill) => `skill_names:${quoteFacetValue(skill)}`);
};

const buildCourseQuery = (skills: string[]): string => {
  if (!skills.length) {
    return '';
  }

  // Use the strongest 2-3 skills as lightweight text signal.
  return skills.slice(0, 3).join(' ');
};

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

const rankSkillsForCourses = (skills: string[]): string[] => {
  const normalized = dedupeStrings(skills);

  // Keep order from the selected career for now.
  // MVP assumption: upstream selected career skills are already meaningful.
  return normalized;
};

/**
 * Service for fetching courses from the scoped catalog index based on selected career skills.
 *
 * Retrieval ladder:
 * 1. Hard scoped filters + strict skill facetFilters
 * 2. Hard scoped filters + text query + optional skill boosts
 * 3. Hard scoped filters only (MVP fallback)
 */
export const courseRetrievalService = {
  async fetchCoursesForCareer(
    index: SearchIndex,
    skills: string[],
    context: FacetBootstrapContext,
  ): Promise<CourseCardModel[]> {
    const rankedSkills = rankSkillsForCourses(skills);

    if (!rankedSkills.length) {
      return [];
    }

    const filters = buildScopedFilters(context);
    const strictSkills = rankedSkills.slice(0, MAX_STRICT_SKILLS);
    const optionalSkills = rankedSkills.slice(0, MAX_OPTIONAL_SKILLS);

    const strictFacetFilters = buildStrictSkillFacetFilters(strictSkills);
    const optionalFilters = buildOptionalSkillFilters(optionalSkills);
    const query = buildCourseQuery(strictSkills);

    const baseParams: Record<string, unknown> = {
      hitsPerPage: DEFAULT_HITS_PER_PAGE,
    };

    if (filters) {
      baseParams.filters = filters;
    }

    try {
      // Attempt 1:
      // Deterministic scoped search with exact skill facet matches.
      const strictResponse = await index.search('', {
        ...baseParams,
        ...(strictFacetFilters ? { facetFilters: strictFacetFilters } : {}),
      });

      if (strictResponse.hits?.length) {
        return strictResponse.hits.map(mapCourseHitToCard);
      }

      // Attempt 2:
      // Use text relevance plus skill boosting.
      const relevanceResponse = await index.search(query, {
        ...baseParams,
        ...(optionalFilters ? { optionalFilters } : {}),
      });

      if (relevanceResponse.hits?.length) {
        return relevanceResponse.hits.map(mapCourseHitToCard);
      }

      // Attempt 3:
      // Final MVP fallback: return top scoped courses so UI is never empty.
      const fallbackResponse = await index.search('', baseParams);

      if (fallbackResponse.hits?.length) {
        return fallbackResponse.hits.map(mapCourseHitToCard);
      }

      return [];
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[courseRetrieval] Failed to fetch courses:', error);
      return [];
    }
  },
};
