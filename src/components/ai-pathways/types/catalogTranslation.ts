import { CatalogFacetSnapshot } from './catalogFacet';

/**
 * RulesFirstCandidates represents the result of the initial deterministic
 * translation of taxonomy terms into catalog-valid values.
 *
 * Pipeline context: Output of the 'rulesFirstMapping' stage.
 */
export interface RulesFirstCandidates {
  /** Taxonomy terms that matched exactly (case-insensitive) with catalog facets. */
  exactMatches: string[];
  /** Taxonomy terms that matched via a curated alias list (see translation.constants.ts). */
  aliasMatches: string[];
  /** Terms that could not be mapped deterministically and should be passed to Xpert for AI mapping. */
  unmatched: string[];
}

/**
 * Input payload for the rules-first translation helper.
 * Combines the target career data with the current catalog snapshot.
 */
export interface TaxonomyTranslationInput {
  /** The professional title selected by the user. */
  careerTitle: string;
  /** List of skills extracted from the taxonomy for this career. */
  skills: string[];
  /** List of industries associated with the career. */
  industries: string[];
  /** List of similar job titles from the taxonomy. */
  similarJobs: string[];
  /** The source of truth for valid catalog facets. */
  facetSnapshot: CatalogFacetSnapshot;
}
