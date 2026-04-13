import { RulesFirstCandidates, TaxonomyTranslationInput } from '../types/catalogTranslation';
import { RulesFirstMappingTrace } from '../types';

/**
 * Curated list of aliases to map common taxonomy terms to their catalog-valid equivalents.
 */
const ALIAS_MAP: Record<string, string> = {
  python: 'Python (Programming Language)',
  javascript: 'JavaScript (Programming Language)',
  sql: 'SQL (Programming Language)',
  'front end': 'Front End (Software Engineering)',
  frontend: 'Front End (Software Engineering)',
};

/**
 * Normalizes a string for comparison.
 */
const normalize = (value: string): string => value.trim().toLowerCase();

/**
 * Rules-first mapper that translates taxonomy terms into catalog-valid search parameters.
 * This module is deterministic and does not use AI/Xpert yet.
 */
export const catalogTranslationRules = {
  /**
   * Translates taxonomy terms into catalog-valid candidates using exact matches and aliases.
   *
   * @param input Taxonomy translation input including career title, skills, industries, and similar jobs.
   * @returns A RulesFirstCandidates object.
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
      normalizedLookup.set(normalize(val), val);
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
      const normTerm = normalize(term);

      // 1. Check Exact Match (Case-insensitive)
      if (normalizedLookup.has(normTerm)) {
        exactMatchesSet.add(normalizedLookup.get(normTerm)!);
        return;
      }

      // 2. Check Alias Map
      const aliasTarget = ALIAS_MAP[normTerm];
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
