import { buildCourseCatalogScopeFilters } from './courseCatalogScopeFilters';
import type { CourseRetrievalCatalogScope } from '../types';

describe('buildCourseCatalogScopeFilters', () => {
  it('always includes content_type:course', () => {
    const catalogScope: CourseRetrievalCatalogScope = { searchCatalogs: [], catalogUuidsToCatalogQueryUuids: {} };

    expect(buildCourseCatalogScopeFilters(catalogScope)).toBe('content_type:course');
  });

  it('ANDs the resolved catalog query UUID OR-group when catalogs resolve', () => {
    const catalogScope: CourseRetrievalCatalogScope = {
      searchCatalogs: ['cat-1', 'cat-2'],
      catalogUuidsToCatalogQueryUuids: { 'cat-1': 'query-1', 'cat-2': 'query-2' },
    };

    expect(buildCourseCatalogScopeFilters(catalogScope)).toBe(
      'content_type:course AND (enterprise_catalog_query_uuids:query-1 OR enterprise_catalog_query_uuids:query-2)',
    );
  });

  it('omits catalogs that have no resolvable query UUID', () => {
    const catalogScope: CourseRetrievalCatalogScope = {
      searchCatalogs: ['cat-1', 'cat-unmapped'],
      catalogUuidsToCatalogQueryUuids: { 'cat-1': 'query-1' },
    };

    expect(buildCourseCatalogScopeFilters(catalogScope)).toBe(
      'content_type:course AND (enterprise_catalog_query_uuids:query-1)',
    );
  });
});
