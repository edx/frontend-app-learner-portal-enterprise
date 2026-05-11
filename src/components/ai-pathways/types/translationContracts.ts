export type CatalogSkillField = 'skill_names' | 'skills.name';

export type RetrievalSkillTier = 'broad_anchor' | 'role_differentiator' | 'narrow_signal' | 'noise';

export interface CatalogSkillMatch {
  taxonomySkill: string;
  catalogSkill: string;
  catalogField: CatalogSkillField;
  matchMethod: 'exact' | 'alias' | 'xpert' | 'none';
  tier?: RetrievalSkillTier;
  score?: number;
  source?: 'intent_required' | 'intent_preferred' | 'career_taxonomy';
  significance?: number;
  reasons?: string[];
}

/**
 * SkillProvenance tracks the origin and mapping status of each taxonomy skill.
 * This helps in debugging and understanding why certain skills were included or dropped.
 */
export interface SkillProvenance {
  taxonomySkill: string;
  catalogMatch?: string;
  catalogField?: CatalogSkillField;
  matchMethod: 'exact' | 'alias' | 'xpert' | 'none';
}

/**
 * CatalogSearchIntent represents the grounded intent for searching the course catalog.
 * It captures the refined search parameters after taxonomy translation.
 */
export interface CatalogSearchIntent {
  /** The primary search query string. Empty string ('') when facet-first mode is active. */
  query: string;
  /** Alternative query strings for text-based fallback searches (e.g., careerTitle). */
  queryAlternates: string[];
  /** Skills that must be present in the results (used in facetFilters). */
  strictSkillFilters: CatalogSkillMatch[];
  /** Skills that should be boosted if present (used in reduced-facet step 2). */
  boostSkillFilters: CatalogSkillMatch[];
  /** Taxonomy skills that were explicitly dropped because they don't exist in the catalog. */
  droppedTaxonomySkills: string[];
}

/**
 * CatalogTranslation represents the complete output of the translation flow.
 * It combines the refined search intent with provenance metadata.
 */
export interface CatalogTranslation extends CatalogSearchIntent {
  /** Detailed mapping history for each input skill. */
  skillProvenance: SkillProvenance[];
  /** Learner level forwarded from intent extraction for reranking. */
  learnerLevel?: string;
}
