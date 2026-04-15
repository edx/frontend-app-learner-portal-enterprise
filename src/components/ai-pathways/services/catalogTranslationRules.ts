import { RulesFirstCandidates, TaxonomyTranslationInput } from '../types/catalogTranslation';
import { RulesFirstMappingTrace } from '../types';
import { CATALOG_ALIAS_MAP } from '../constants';

/**
 * @typedef {Object} TaxonomyTranslationInput
 * @property {string} careerTitle - User's target career title
 * @property {string[]} skills - Extracted skills from taxonomy
 * @property {string[]} industries - Extracted industries from taxonomy
 * @property {string[]} similarJobs - Similar job titles from taxonomy
 * @property {Object} facetSnapshot - Snapshot of available catalog facets
 */

/**
 * @typedef {Object} RulesFirstCandidates
 * @property {string[]} exactMatches - Terms that matched exactly (case-insensitive)
 * @property {string[]} aliasMatches - Terms that matched via curated alias list
 * @property {string[]} unmatched - Terms that could not be mapped
 */

/**
 * Normalizes a term for catalog alias matching and comparison.
 *
 * @param {string} term - Raw taxonomy term or catalog facet value
 * @returns {string} Normalized string (trimmed, lowercase)
 *
 * @remarks
 * Pipeline: translation (rules-first)
 */
export const normalizeCatalogTerm = (term: string): string => term.trim().toLowerCase();

/**
 * Rules-first mapper that translates taxonomy terms into catalog-valid search parameters.
 *
 * @remarks
 * Pipeline: intake → intent → translation (rules) → retrieval
 *
 * Dependencies:
 * - CATALOG_ALIAS_MAP (curated aliases)
 * - catalog facet snapshot (ground truth)
 *
 * Notes:
 * - This module is deterministic and does not use AI/Xpert.
 * - Results are used to ground the search and provide context for Xpert refinement.
 */
export const catalogTranslationRules = {
  /**
   * Translates taxonomy terms into catalog-valid candidates using exact matches and aliases.
   *
   * @param {TaxonomyTranslationInput} input - Taxonomy translation input
   * @returns {{ result: RulesFirstCandidates; trace: RulesFirstMappingTrace }} Resulting candidates and trace
   */
  translateTaxonomyToCatalog(
    input: TaxonomyTranslationInput,
  ): { result: RulesFirstCandidates; trace: RulesFirstMappingTrace } {
    const {
      careerTitle,
      skills,
      industries,
      similarJobs,
      facetSnapshot,
    } = input;

    // Build a set of all valid catalog skills/subjects for O(1) lookup
    const validCatalogValues = new Set<string>();
    facetSnapshot.skill_names.forEach((s) => validCatalogValues.add(s));
    facetSnapshot['skills.name'].forEach((s) => validCatalogValues.add(s));
    facetSnapshot.subjects.forEach((s) => validCatalogValues.add(s));

    // Create a normalized lookup map (normalizedValue -> originalCatalogValue)
    const normalizedLookup = new Map<string, string>();
    validCatalogValues.forEach((val) => {
      normalizedLookup.set(normalizeCatalogTerm(val), val);
    });

    const exactMatchesSet = new Set<string>();
    const aliasMatchesSet = new Set<string>();
    const unmatchedSet = new Set<string>();

    // Combine all inputs to be translated
    const termsToTranslate = Array.from(
      new Set(
        [careerTitle, ...skills, ...industries, ...similarJobs]
          .map((t) => t.trim())
          .filter(Boolean),
      ),
    );

    termsToTranslate.forEach((term) => {
      const normTerm = normalizeCatalogTerm(term);

      // 1. Check Exact Match (Case-insensitive)
      if (normalizedLookup.has(normTerm)) {
        exactMatchesSet.add(normalizedLookup.get(normTerm)!);
        return;
      }

      // 2. Check Alias Map
      const aliasTarget = CATALOG_ALIAS_MAP[normTerm];
      if (aliasTarget) {
        // Only count as alias match if the target exists in the catalog
        if (validCatalogValues.has(aliasTarget)) {
          aliasMatchesSet.add(aliasTarget);
          return;
        }
        // If the alias target isn't in this specific catalog, it's still unmatched
      }

      // 3. Unmatched
      unmatchedSet.add(term);
    });

    const result: RulesFirstCandidates = {
      exactMatches: Array.from(exactMatchesSet).sort(),
      aliasMatches: Array.from(aliasMatchesSet).sort(),
      unmatched: Array.from(unmatchedSet).sort(),
    };

    const trace: RulesFirstMappingTrace = {
      termsConsidered: termsToTranslate.length,
      exactMatchCount: result.exactMatches.length,
      aliasMatchCount: result.aliasMatches.length,
      unmatchedCount: result.unmatched.length,
      exactMatches: result.exactMatches,
      aliasMatches: result.aliasMatches,
      unmatched: result.unmatched,
    };

    return { result, trace };
  },
};
