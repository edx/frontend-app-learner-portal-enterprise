import { RulesFirstCandidates, TaxonomyTranslationInput } from '../types/catalogTranslation';
import { RulesFirstMappingTrace } from '../types';
import { CATALOG_ALIAS_MAP } from '../constants';

/**
 * Normalizes a term for catalog alias matching and comparison.
 * Trims whitespace and converts to lowercase for consistent case-insensitive lookup.
 *
 * @param term The raw taxonomy term or catalog facet value.
 * @returns A normalized string.
 */
export const normalizeCatalogTerm = (term: string): string => term.trim().toLowerCase();

/**
 * Deterministic mapper that translates taxonomy terms into catalog-valid search parameters.
 *
 * Pipeline context: This is the first sub-stage of the 'catalogTranslation' phase.
 * It uses high-confidence rules (exact matches and a curated alias map) to ground
 * taxonomy data into the specific course catalog.
 *
 * Because this module is deterministic, it provides a reliable baseline before
 * any AI-driven translation is attempted.
 */
export const catalogTranslationRules = {
  /**
   * Translates taxonomy terms into catalog-valid candidates using exact matches and aliases.
   *
   * @param input Structured taxonomy data and the current catalog facet snapshot.
   * @returns An object containing the successfully mapped candidates and a detailed trace.
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

    // Build a set of all valid catalog skills/subjects for O(1) lookup.
    const validCatalogValues = new Set<string>();
    facetSnapshot.skill_names.forEach((s) => validCatalogValues.add(s));
    facetSnapshot['skills.name'].forEach((s) => validCatalogValues.add(s));
    facetSnapshot.subjects.forEach((s) => validCatalogValues.add(s));

    // Create a normalized lookup map (normalizedValue -> originalCatalogValue).
    // This allows case-insensitive exact matching while preserving the catalog's casing.
    const normalizedLookup = new Map<string, string>();
    validCatalogValues.forEach((val) => {
      normalizedLookup.set(normalizeCatalogTerm(val), val);
    });

    const exactMatchesSet = new Set<string>();
    const aliasMatchesSet = new Set<string>();
    const unmatchedSet = new Set<string>();

    // Combine all inputs to be translated into a unique list.
    const termsToTranslate = Array.from(
      new Set(
        [careerTitle, ...skills, ...industries, ...similarJobs]
          .map((t) => t.trim())
          .filter(Boolean),
      ),
    );

    termsToTranslate.forEach((term) => {
      const normTerm = normalizeCatalogTerm(term);

      // 1. Check Exact Match (Case-insensitive).
      if (normalizedLookup.has(normTerm)) {
        exactMatchesSet.add(normalizedLookup.get(normTerm)!);
        return;
      }

      // 2. Check Curated Alias Map.
      const aliasTarget = CATALOG_ALIAS_MAP[normTerm];
      if (aliasTarget) {
        // Only count as an alias match if the target actually exists in the current catalog.
        if (validCatalogValues.has(aliasTarget)) {
          aliasMatchesSet.add(aliasTarget);
          return;
        }
      }

      // 3. Mark as unmatched for later stages (e.g., AI Mapping).
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
