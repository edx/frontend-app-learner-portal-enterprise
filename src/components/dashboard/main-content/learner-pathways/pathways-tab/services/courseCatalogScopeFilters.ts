import { AlgoliaFilterBuilder } from '../../../../../AlgoliaFilterBuilder';
import type { CourseRetrievalCatalogScope } from '../types';
import { getPathwaysSupportedLocale, getPathwaysSupportedLocaleLanguageName } from '../../../../../app/data';

/**
 * Builds the shared "course content, scoped to this enterprise's catalog" hard-filter
 * expression, used identically by `catalogFacetService`'s facet snapshot and
 * `courseRetrieval`'s retrieval-ladder searches — both must search the exact same scope,
 * or the facet vocabulary grounding skill matches could drift from what the ladder
 * actually searches against.
 */
export const buildCourseCatalogScopeFilters = (catalogScope: CourseRetrievalCatalogScope): string => {
  const supportedLocale = getPathwaysSupportedLocale();
  return new AlgoliaFilterBuilder()
    .and('content_type', 'course')
    // .filterByCatalogQueryUuids(catalogScope.searchCatalogs, catalogScope.catalogUuidsToCatalogQueryUuids)
    .filterByMetadataLanguage(supportedLocale)
    .filterCoursesByLanguage(getPathwaysSupportedLocaleLanguageName(supportedLocale))
    .build();
};
