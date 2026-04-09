import { SearchIndex, SearchOptions } from 'algoliasearch/lite';
import AlgoliaFilterBuilder from '../../AlgoliaFilterBuilder/AlgoliaFilterBuilder';
import {
  FacetBootstrapContext,
  CourseCardModel,
  CatalogTranslation,
} from '../types';
import { debugLogger } from '../utils/debugLogger';

const DEFAULT_HITS_PER_PAGE = 5;
const MIN_RESULTS = 3;

const isNonEmptyString = (value?: string | null): value is string => Boolean((value || '').trim());

const quoteFacetValue = (value: string): string => `"${value.replace(/"/g, '\\"')}"`;

const buildScopedFilters = (): string | undefined => {
  const builder = new AlgoliaFilterBuilder();

  builder.and('content_type', 'course');

  const builtFilters = builder.build();

  return isNonEmptyString(builtFilters) ? builtFilters : undefined;
};

/**
 * Build parameters for Attempt 1: Strict skill facet matching.
 */
const buildStrictParams = (
  translation: CatalogTranslation,
  baseParams: SearchOptions,
): SearchOptions => {
  if (!translation.strictSkills.length) {
    return { ...baseParams, hitsPerPage: 0 };
  }

  return {
    ...baseParams,
    // One OR group: match any of these skills.
    facetFilters: [translation.strictSkills.map((skill) => `skill_names:${skill}`)],
  };
};

/**
 * Build parameters for Attempt 2: Optional skill boosting with text query.
 */
const buildBoostParams = (
  translation: CatalogTranslation,
  baseParams: SearchOptions,
): SearchOptions => {
  const params: SearchOptions = { ...baseParams };

  if (translation.boostSkills.length) {
    params.optionalFilters = translation.boostSkills.map((skill) => `skill_names:${quoteFacetValue(skill)}`);
  }

  return params;
};

/**
 * Build parameters for Attempt 3: Text query / Alternates fallback.
 */
const buildQueryFallbackParams = (
  query: string,
  baseParams: SearchOptions,
): SearchOptions => ({
  ...baseParams,
  query,
});

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
 * Service for fetching courses from the scoped catalog index based on CatalogTranslation.
 *
 * Retrieval ladder:
 * 1. Hard scoped filters + strict skill facetFilters
 * 2. Hard scoped filters + boost skill optionalFilters
 * 3. Hard scoped filters + query / queryAlternates
 * 4. Hard scoped filters only (MVP fallback)
 */
export const courseRetrievalService = {
  /**
   * Executes the course retrieval ladder grounded in the provided CatalogTranslation.
   *
   * @param index The Algolia search index for the course catalog.
   * @param translation The grounded translation results (query, skills, etc.).
   * @param context The enterprise search context.
   * @returns A promise resolving to 3-5 normalized CourseCardModel objects.
   */
  async fetchCourses(
    index: SearchIndex,
    translation: CatalogTranslation,
  ): Promise<CourseCardModel[]> {
    const filters = buildScopedFilters();
    const baseParams: SearchOptions = {
      hitsPerPage: DEFAULT_HITS_PER_PAGE,
      ...(filters ? { filters } : {}),
    };

    try {
      // 1. Attempt Strict Facet Matching
      const strictParams = buildStrictParams(translation, baseParams);
      debugLogger.log('Retrieval Ladder Step 1: Strict Facet Matching', {
        query: translation.query,
        facetFilters: strictParams.facetFilters,
        hitsPerPage: strictParams.hitsPerPage,
      });

      if ((strictParams.hitsPerPage ?? 1) > 0) {
        const strictResponse = await index.search(translation.query, strictParams);
        if (strictResponse.hits?.length >= MIN_RESULTS) {
          debugLogger.log('Success: Strict Facet Matching', { hitCount: strictResponse.hits.length });
          return strictResponse.hits.map(mapCourseHitToCard);
        }
      }

      // 2. Attempt Boosted Optional Filters
      const boostParams = buildBoostParams(translation, baseParams);
      debugLogger.log('Retrieval Ladder Step 2: Boosted Optional Filters', {
        query: translation.query,
        optionalFilters: boostParams.optionalFilters,
      });

      const boostResponse = await index.search(translation.query, boostParams);
      if (boostResponse.hits?.length >= MIN_RESULTS) {
        debugLogger.log('Success: Boosted Optional Filters', { hitCount: boostResponse.hits.length });
        return boostResponse.hits.map(mapCourseHitToCard);
      }

      // 3. Attempt Query Alternates
      const queries = [translation.query, ...translation.queryAlternates].filter(Boolean);
      for (const q of queries) {
        const queryParams = buildQueryFallbackParams(q, baseParams);
        debugLogger.log('Retrieval Ladder Step 3: Query Alternate', { query: q });
        // eslint-disable-next-line no-await-in-loop
        const queryResponse = await index.search(q, queryParams);
        if (queryResponse.hits?.length >= MIN_RESULTS) {
          debugLogger.log('Success: Query Alternate', { query: q, hitCount: queryResponse.hits.length });
          return queryResponse.hits.map(mapCourseHitToCard);
        }
      }

      // 4. Final Fallback: Scope Only
      debugLogger.log('Retrieval Ladder Step 4: Final Fallback (Scope Only)');
      const fallbackResponse = await index.search('', baseParams);
      debugLogger.log('Final Result: Scope Only', { hitCount: fallbackResponse.hits?.length || 0 });
      return (fallbackResponse.hits || []).map(mapCourseHitToCard);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[courseRetrieval] Failed to execute retrieval ladder:', error);
      return [];
    }
  },

  /**
   * DEPRECATED: Use fetchCourses instead.
   * Maintains compatibility while the translation flow is being wired up.
   */
  async fetchCoursesForCareer(
    index: SearchIndex,
    skills: string[],
    context: FacetBootstrapContext,
  ): Promise<CourseCardModel[]> {
    const dummyTranslation: CatalogTranslation = {
      query: '',
      queryAlternates: [],
      strictSkills: skills.slice(0, 8),
      boostSkills: skills.slice(0, 12),
      subjectHints: [],
      droppedTaxonomySkills: [],
      skillProvenance: [],
      algoliaPrimaryRequest: {},
      algoliaFallbackRequests: [],
    };

    return this.fetchCourses(index, dummyTranslation);
  },
};
