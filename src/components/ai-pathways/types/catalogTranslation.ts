import { CatalogFacetSnapshot } from './catalogFacet';

/**
 * RulesFirstCandidates represents the result of the initial deterministic
 * translation of taxonomy terms into catalog-valid values.
 */
export interface RulesFirstCandidates {
  /** Terms that matched exactly (case-insensitive) with catalog facets. */
  exactMatches: string[];
  /** Terms that matched via a curated alias list. */
  aliasMatches: string[];
  /** Terms that could not be mapped and should be passed to later stages (e.g., Xpert). */
  unmatched: string[];
}

/**
 * Input for the rules-first translation helper.
 */
export interface TaxonomyTranslationInput {
  careerTitle: string;
  skills: string[];
  industries: string[];
  similarJobs: string[];
  facetSnapshot: CatalogFacetSnapshot;
}
