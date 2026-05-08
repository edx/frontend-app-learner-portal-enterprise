import { RulesFirstCandidates, TaxonomyTranslationInput } from '../types/catalogTranslation';
import { CatalogSkillMatch, RulesFirstMappingTrace } from '../types';
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
      skills,
      facetSnapshot,
    } = input;

    // Build a set of all valid catalog skills/subjects for O(1) lookup.
    const validCatalogValues = new Set<string>();
    const normalizedLookup = new Map<
    string,
    { value: string; field: 'skill_names' | 'skills.name' | 'subjects' }
    >();

    // Create a normalized lookup map (normalizedValue -> originalCatalogValue).
    // This allows case-insensitive exact matching while preserving the catalog's casing.
    facetSnapshot.skill_names.forEach((value) => {
      validCatalogValues.add(value);
      normalizedLookup.set(normalizeCatalogTerm(value), {
        value,
        field: 'skill_names',
      });
    });

    facetSnapshot['skills.name'].forEach((value) => {
      validCatalogValues.add(value);

      if (!normalizedLookup.has(normalizeCatalogTerm(value))) {
        normalizedLookup.set(normalizeCatalogTerm(value), {
          value,
          field: 'skills.name',
        });
      }
    });

    facetSnapshot.subjects.forEach((value) => {
      validCatalogValues.add(value);
      normalizedLookup.set(normalizeCatalogTerm(value), {
        value,
        field: 'subjects',
      });
    });

    // Create a normalized lookup map (normalizedValue -> originalCatalogValue).
    // This allows case-insensitive exact matching while preserving the catalog's casing.

    const exactMatchesSet = new Set<string>();
    const aliasMatchesSet = new Set<string>();
    const unmatchedSet = new Set<string>();
    const exactSkillFilters: CatalogSkillMatch[] = [];
    const aliasSkillFilters: CatalogSkillMatch[] = [];

    // Combine all inputs to be translated into a unique list.
    const termsToTranslate = Array.from(
      new Set(
        skills
          .map((t) => t.trim())
          .filter(Boolean),
      ),
    );

    termsToTranslate.forEach((term) => {
      const normTerm = normalizeCatalogTerm(term);

      // 1. Check Exact Match (Case-insensitive).
      if (normalizedLookup.has(normTerm)) {
        const match = normalizedLookup.get(normTerm)!;

        exactMatchesSet.add(match.value);

        if (match.field === 'skill_names' || match.field === 'skills.name') {
          exactSkillFilters.push({
            taxonomySkill: term,
            catalogSkill: match.value,
            catalogField: match.field,
            matchMethod: 'exact',
          });
        }
        return;
      }

      // 2. Check Curated Alias Map.
      const aliasTarget = CATALOG_ALIAS_MAP[normTerm];

      if (aliasTarget) {
        const aliasMatch = normalizedLookup.get(normalizeCatalogTerm(aliasTarget));

        if (aliasMatch && (aliasMatch.field === 'skill_names' || aliasMatch.field === 'skills.name')) {
          aliasMatchesSet.add(aliasMatch.value);

          aliasSkillFilters.push({
            taxonomySkill: term,
            catalogSkill: aliasMatch.value,
            catalogField: aliasMatch.field,
            matchMethod: 'alias',
          });

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
      exactSkillFilters,
      aliasSkillFilters,
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
