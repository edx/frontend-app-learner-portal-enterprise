import type { CareerMatch } from '../state';
import type { CareerSearchIntent } from './careerRetrieval';

/**
 * Already-resolved enterprise catalog scope for course retrieval. Every real
 * catalog-scoping mechanism in this repo (`useAlgoliaSearch`, `useDefaultSearchFilters`)
 * resolves this from a BFF call inside a React hook; since this service is hook-free,
 * the caller resolves it and passes it in. Shaped to match
 * `AlgoliaFilterBuilder.filterByCatalogQueryUuids`'s existing params exactly.
 */
export interface CourseRetrievalCatalogScope {
  searchCatalogs: string[];
  catalogUuidsToCatalogQueryUuids: Record<string, string>;
}

/**
 * The subset of a selected `CareerMatch` course retrieval needs: the title (text-query
 * fallback) and the skills the learner is developing toward it (boost signal).
 */
export type CourseSearchSelectedCareer = Pick<CareerMatch, 'title' | 'skillsToDevelop'>;

export interface CourseSearchOptions {
  selectedCareer: CourseSearchSelectedCareer;
  /** Reused as-is from career retrieval; `.learnerLevel` is the sanctioned rerank signal. */
  intent: CareerSearchIntent;
  catalogScope: CourseRetrievalCatalogScope;
}

/**
 * Scoped facet vocabulary snapshot from the course catalog index, used to ground
 * taxonomy/intent skill signals against catalog-valid terms before they become filters.
 * All five groups are always arrays (never undefined), even when Algolia returns no
 * values for a given facet.
 */
export interface CatalogFacetSnapshot {
  skill_names: string[];
  'skills.name': string[];
  subjects: string[];
  level_type: string[];
  'partners.name': string[];
}
