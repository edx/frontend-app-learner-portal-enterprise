/**
 * CatalogFacetSnapshot represents the scoped facet values retrieved from Algolia.
 * This snapshot is used as the source of truth for translating taxonomy skills
 * into valid catalog search parameters. It ensures that any skill or subject
 * recommended by the AI actually exists in the learner's specific catalog.
 *
 * Pipeline context: Captured during the 'catalogFacetSnapshot' stage.
 */
export interface CatalogFacetSnapshot {
  /** All available skill names in the scoped catalog (primary field). */
  skill_names: string[];

  /** Additional skill names stored in the nested 'skills.name' field. */
  'skills.name': string[];

  /** High-level subjects or categories found in the catalog. */
  subjects: string[];

  /** Course difficulty levels (e.g., 'Beginner', 'Intermediate') present in the catalog. */
  level_type: string[];

  /** Names of partners or content providers in the catalog. */
  'partners.name': string[];

  /** The specific enterprise catalog query UUIDs used to scope this snapshot. */
  enterprise_catalog_query_uuids?: string[];
}

/**
 * Configuration options for the facet retrieval service.
 * Determines how many values are fetched and what initial filters are applied.
 */
export interface FacetRetrievalConfig {
  /**
   * Maximum number of values to retrieve per facet (default: 1000).
   * High values ensure better coverage but may increase latency.
   */
  maxValuesPerFacet?: number;

  /**
   * Scoped filters to apply to the facet query.
   * Example: 'content_type:course AND language:en'.
   */
  filters?: string;
}
