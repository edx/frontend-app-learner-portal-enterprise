/**
 * CatalogFacetSnapshot represents the scoped facet values retrieved from Algolia.
 * This snapshot is used as the source of truth for translating taxonomy skills
 * into valid catalog search parameters.
 */
export interface CatalogFacetSnapshot {
  /** All available skill names in the scoped catalog. */
  skill_names: string[];

  /** Additional skill names sometimes stored in the nested skills.name field. */
  'skills.name': string[];

  /** High-level subjects or categories. */
  subjects: string[];

  /** Course difficulty levels (e.g., Beginner, Intermediate). */
  level_type: string[];

  /** Partner/Content provider names. */
  'partners.name': string[];
}

/**
 * Configuration for the facet retrieval service.
 */
export interface FacetRetrievalConfig {
  /** Maximum number of values to retrieve per facet (default: 1000). */
  maxValuesPerFacet?: number;

  /** Scoped filters to apply to the facet query (e.g., content_type:course). */
  filters?: string;
}
