import { SearchOptions } from 'algoliasearch/lite';
import { CatalogFacetSnapshot } from './catalogFacet';

/**
 * SkillProvenance tracks the origin and mapping status of each taxonomy skill.
 * This helps in debugging and understanding why certain skills were included or dropped.
 */
export interface SkillProvenance {
  /** The original skill name from the taxonomy index. */
  taxonomySkill: string;
  /** The corresponding valid skill name in the catalog (if matched). */
  catalogMatch?: string;
  /** The method used to determine the match. */
  matchMethod: 'exact' | 'alias' | 'xpert' | 'none';
}

/**
 * CatalogSearchIntent represents the grounded intent for searching the course catalog.
 * It captures the refined search parameters after taxonomy translation.
 */
export interface CatalogSearchIntent {
  /** The primary search query string. */
  query: string;
  /** Alternative query strings for broader or fallback searches. */
  queryAlternates: string[];
  /** Skills that must be present in the results (used in facetFilters). */
  strictSkills: string[];
  /** Skills that should be boosted if present (used in optionalFilters). */
  boostSkills: string[];
  /** High-level subjects to nudge the search towards specific categories. */
  subjectHints: string[];
  /** Taxonomy skills that were explicitly dropped because they don't exist in the catalog. */
  droppedTaxonomySkills: string[];
}

/**
 * Payload sent to Xpert to perform grounded translation of unmatched taxonomy terms.
 * Includes the catalog snapshot to ensure Xpert only suggests valid values.
 */
export interface XpertCatalogTranslationPayload {
  careerTitle: string;
  unmatchedSkills: string[];
  unmatchedIndustries: string[];
  unmatchedSimilarJobs: string[];
  facetSnapshot: CatalogFacetSnapshot;
}

/**
 * CatalogTranslation represents the complete output of the translation flow.
 * It combines the refined search intent with ready-to-use Algolia request objects.
 */
export interface CatalogTranslation extends CatalogSearchIntent {
  /** Detailed mapping history for each input skill. */
  skillProvenance: SkillProvenance[];
  /** Pre-configured Algolia search request parameters for the primary attempt. */
  algoliaPrimaryRequest: SearchOptions;
  /** A sequence of fallback search requests to be used if the primary search returns no results. */
  algoliaFallbackRequests: SearchOptions[];
  /** The raw payload used for the Xpert translation stage (if applicable). */
  xpertSystemPromptPayload?: XpertCatalogTranslationPayload;
}
