import {
  CatalogFacetSnapshot,
  RulesFirstCandidates,
  CatalogTranslation,
  CatalogSearchIntent,
  SkillProvenance,
} from '../types';
import { debugLogger } from '../utils/debugLogger';

const MAX_STRICT_SKILLS = 8;
const MAX_BOOST_SKILLS = 12;

/**
 * Validates that a list of values exists in the provided catalog facet snapshot.
 *
 * @param values The values to validate.
 * @param allowedValues A set of all valid values from the snapshot.
 * @returns An array of only the valid values.
 */
export const validateAllowedFacetValues = (
  values: string[],
  allowedValues: Set<string>,
): string[] => values.filter((val) => allowedValues.has(val));

/**
 * Caps the number of skills to a reasonable maximum to avoid overly complex Algolia queries.
 *
 * @param skills The skills to cap.
 * @param limit The maximum number of skills allowed.
 * @returns A capped array of skills.
 */
export const capSkillCounts = (skills: string[], limit: number): string[] => skills.slice(0, limit);

/**
 * Service for combining rules-first translation with Xpert-driven refinement
 * to produce the final CatalogTranslation object.
 */
export const catalogTranslationService = {
  /**
   * Consolidates rules-first matches and Xpert output into a final search intent.
   * Grounding and validation are performed here to ensure only valid facets are used.
   *
   * @param careerTitle The selected career title.
   * @param facetSnapshot The scoped catalog facets for grounding.
   * @param rulesFirst The results from the deterministic rules-first mapper.
   * @param xpertRawResponse The raw (and potentially untrusted) JSON response from Xpert.
   * @returns A CatalogTranslation object.
   */
  processTranslation(
    careerTitle: string,
    facetSnapshot: CatalogFacetSnapshot,
    rulesFirst: RulesFirstCandidates,
    xpertRawResponse?: string,
  ): CatalogTranslation {
    const validCatalogValues = this.buildValidFacetSet(facetSnapshot);

    // 1. Build initial intent from RulesFirst
    let finalIntent: CatalogSearchIntent = {
      query: careerTitle,
      queryAlternates: [],
      strictSkills: [...rulesFirst.exactMatches, ...rulesFirst.aliasMatches],
      boostSkills: [],
      subjectHints: [],
      droppedTaxonomySkills: [],
    };

    let xpertProvenance: SkillProvenance[] = [];

    // 2. Parse and Ground Xpert Response (if available)
    if (xpertRawResponse) {
      try {
        const xpertData = this.parseXpertJson(xpertRawResponse);
        if (xpertData) {
          // Ground Xpert output: Only keep skills/subjects that exist in the snapshot
          const groundedStrict = validateAllowedFacetValues(xpertData.strictSkills || [], validCatalogValues);
          const groundedBoost = validateAllowedFacetValues(xpertData.boostSkills || [], validCatalogValues);
          const groundedSubjects = validateAllowedFacetValues(xpertData.subjectHints || [], validCatalogValues);

          // Merge Xpert findings with rules-first candidates, giving Xpert data precedence for query refinement
          finalIntent = {
            query: xpertData.query || finalIntent.query,
            queryAlternates: xpertData.queryAlternates || [],
            strictSkills: Array.from(new Set([...finalIntent.strictSkills, ...groundedStrict])),
            boostSkills: groundedBoost,
            subjectHints: groundedSubjects,
            droppedTaxonomySkills: Array.from(new Set([...(xpertData.droppedTaxonomySkills || [])])),
          };

          xpertProvenance = xpertData.skillProvenance || [];
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn('[catalogTranslationService] Failed to parse Xpert response, falling back to rules-first.', error);
      }
    }

    // 3. Final Validation & Capping
    finalIntent.strictSkills = capSkillCounts(finalIntent.strictSkills, MAX_STRICT_SKILLS);
    finalIntent.boostSkills = capSkillCounts(finalIntent.boostSkills, MAX_BOOST_SKILLS);

    // 4. Construct Skill Provenance
    const skillProvenance = this.buildSkillProvenance(rulesFirst, xpertProvenance);

    debugLogger.log('Validated Translation Summary', {
      query: finalIntent.query,
      strictSkills: debugLogger.summarizeList(finalIntent.strictSkills),
      boostSkills: debugLogger.summarizeList(finalIntent.boostSkills),
      subjectHints: debugLogger.summarizeList(finalIntent.subjectHints),
      droppedTaxonomySkills: debugLogger.summarizeList(finalIntent.droppedTaxonomySkills),
      skillProvenanceCount: skillProvenance.length,
      xpertUsed: !!xpertRawResponse,
    });

    // 5. Construct Algolia Request (Placeholder - logic to be added in next step: Course Retrieval)
    // For now, we return empty request objects to satisfy the type contract.
    return {
      ...finalIntent,
      skillProvenance,
      algoliaPrimaryRequest: {},
      algoliaFallbackRequests: [],
    };
  },

  /**
   * Helper to build a unified set of all valid facet values for O(1) lookup.
   */
  buildValidFacetSet(facetSnapshot: CatalogFacetSnapshot): Set<string> {
    const valid = new Set<string>();
    facetSnapshot.skill_names.forEach((s) => valid.add(s));
    facetSnapshot['skills.name'].forEach((s) => valid.add(s));
    facetSnapshot.subjects.forEach((s) => valid.add(s));
    return valid;
  },

  /**
   * Safely parses the Xpert JSON response, handling markdown fences if present.
   */
  parseXpertJson(raw: string): any {
    let cleaned = raw.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/^```json/, '').replace(/```$/, '').trim();
    }
    try {
      return JSON.parse(cleaned);
    } catch (e) {
      return null;
    }
  },

  /**
   * Merges rules-first match history with Xpert mapping provenance.
   */
  buildSkillProvenance(rulesFirst: RulesFirstCandidates, xpertProvenance: SkillProvenance[]): SkillProvenance[] {
    const provenance: SkillProvenance[] = [];

    // Exact matches
    rulesFirst.exactMatches.forEach((match) => {
      provenance.push({ taxonomySkill: match, catalogMatch: match, matchMethod: 'exact' });
    });

    // Alias matches (note: RulesFirst only stores the target, but we'll approximate for now)
    rulesFirst.aliasMatches.forEach((match) => {
      provenance.push({ taxonomySkill: match, catalogMatch: match, matchMethod: 'alias' });
    });

    // Merge Xpert provenance for unmatched items
    xpertProvenance.forEach((xp) => {
      // Avoid duplicates if Xpert re-reports an exact match
      if (!provenance.some((p) => p.taxonomySkill === xp.taxonomySkill)) {
        provenance.push(xp);
      }
    });

    return provenance;
  },
};
