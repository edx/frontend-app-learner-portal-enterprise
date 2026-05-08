import {
  CatalogFacetSnapshot,
  RulesFirstCandidates,
  CatalogTranslation,
  CatalogSearchIntent,
  SkillProvenance,
  CatalogTranslationTrace,
} from '../types';

/** Maximum number of hard skill filters to include in an Algolia request. */
const MAX_STRICT_SKILLS = 8;
/** Maximum number of optional boosting filters to include. */
const MAX_BOOST_SKILLS = 12;

/**
 * Validates that a list of values exists in the provided catalog facet snapshot.
 * Ensures that terms suggested by the AI are actually present in the learner's catalog.
 *
 * @param values The values to validate.
 * @param allowedValues A set of all valid values from the snapshot for O(1) lookup.
 * @returns An array of only the valid values.
 */
export const validateAllowedFacetValues = (
  values: string[],
  allowedValues: Set<string>,
): string[] => values.filter((val) => allowedValues.has(val));

/**
 * Caps the number of filters to a reasonable maximum to maintain search performance.
 *
 * @param skills The skills to cap.
 * @param limit The maximum number of skills allowed.
 * @returns A capped array of skills.
 */
export const capSkillCounts = (skills: string[], limit: number): string[] => skills.slice(0, limit);

/**
 * Service for orchestrating the hybrid translation of taxonomy terms to catalog facets.
 *
 * Pipeline context: This is the 'catalogTranslation' stage. It takes professional
 * roles and skills from the taxonomy index and maps them to valid search filters
 * in the specific course catalog assigned to the learner.
 *
 * It follows a hybrid strategy:
 * 1. Deterministic: Uses exact matches and curated aliases first (Reliable).
 * 2. Probabilistic: Uses AI (Xpert) to map remaining unmatched terms (Flexible).
 * 3. Grounding: Validates all final terms against a real-time facet snapshot (Accurate).
 */
export const catalogTranslationService = {
  /**
   * Processes the full translation flow, merging rules-first and AI results.
   *
   * @param careerTitle The professional title chosen by the user.
   * @param facetSnapshot The authoritative list of valid catalog facets.
   * @param rulesFirst The results from the deterministic mapping stage.
   * @param xpertRawResponse The raw AI response string (if the AI stage was triggered).
   * @param xpertDebug Optional performance and debug metrics from the AI stage.
   * @returns A result object containing the final consolidated translation and a trace.
   */
  processTranslation(
    careerTitle: string,
    facetSnapshot: CatalogFacetSnapshot,
    rulesFirst: RulesFirstCandidates,
    xpertRawResponse?: string,
    xpertDebug?: {
      systemPrompt: string;
      rawResponse: string;
      durationMs: number;
      success: boolean;
      discovery?: any;
      wasDiscoveryUsed?: boolean;
    },
  ): { translation: CatalogTranslation; trace: CatalogTranslationTrace } {
    const validCatalogValues = this.buildValidFacetSet(facetSnapshot);

    // 1. Initialize intent from deterministic rules-first matches.
    let finalIntent: CatalogSearchIntent = {
      query: [...rulesFirst.exactMatches, ...rulesFirst.aliasMatches].join(' '),
      queryAlternates: [],
      strictSkills: [...rulesFirst.exactMatches, ...rulesFirst.aliasMatches],
      boostSkills: [],
      strictSkillFilters: [
        ...rulesFirst.exactSkillFilters,
        ...rulesFirst.aliasSkillFilters,
      ],
      boostSkillFilters: [],
      subjectHints: [],
      droppedTaxonomySkills: [],
    };

    let xpertProvenance: SkillProvenance[] = [];
    let xpertDiscovery: any = xpertDebug?.discovery;
    let xpertWasDiscoveryUsed: boolean | undefined = xpertDebug?.wasDiscoveryUsed;

    // 2. Parse and ground the AI-suggested terms (if applicable).
    if (xpertRawResponse) {
      try {
        const xpertData = this.parseXpertJson(xpertRawResponse);
        if (xpertData) {
          // Capture discovery data if returned by the AI
          if (xpertData.discovery) {
            xpertDiscovery = xpertData.discovery;
          }
          if (typeof xpertData.wasDiscoveryUsed === 'boolean') {
            xpertWasDiscoveryUsed = xpertData.wasDiscoveryUsed;
          }

          // Grounding: Discard any values suggested by the AI that aren't in the snapshot.
          const groundedStrict = validateAllowedFacetValues(xpertData.strictSkills || [], validCatalogValues);
          const groundedBoost = validateAllowedFacetValues(xpertData.boostSkills || [], validCatalogValues);
          const groundedSubjects = validateAllowedFacetValues(xpertData.subjectHints || [], validCatalogValues);
          const groundedStrictFilters = xpertData.strictSkillFilters || [];
          const groundedBoostFilters = xpertData.boostSkillFilters || [];

          finalIntent = {
            query: xpertData.query || finalIntent.query,
            queryAlternates: xpertData.queryAlternates || [],
            strictSkills: Array.from(new Set([...finalIntent.strictSkills, ...groundedStrict])),
            boostSkills: groundedBoost,
            strictSkillFilters: [
              ...finalIntent.strictSkillFilters,
              ...groundedStrictFilters,
            ],
            boostSkillFilters: groundedBoostFilters,
            subjectHints: groundedSubjects,
            droppedTaxonomySkills: Array.from(new Set([...(xpertData.droppedTaxonomySkills || [])])),
          };

          xpertProvenance = xpertData.skillProvenance || [];
        }
      } catch {
        // AI parse failed: the pipeline continues using only deterministic results.
      }
    }

    // 3. Apply safety caps to filter counts.
    finalIntent.strictSkillFilters = finalIntent.strictSkillFilters.slice(0, MAX_STRICT_SKILLS);
    finalIntent.boostSkillFilters = finalIntent.boostSkillFilters.slice(0, MAX_BOOST_SKILLS);

    // 4. Construct the consolidated mapping history.
    const skillProvenance = this.buildSkillProvenance(rulesFirst, xpertProvenance);

    const trace: CatalogTranslationTrace = {
      query: finalIntent.query,
      queryAlternates: finalIntent.queryAlternates,
      strictSkillCount: finalIntent.strictSkills.length,
      boostSkillCount: finalIntent.boostSkills.length,
      subjectHintCount: finalIntent.subjectHints.length,
      droppedSkillCount: finalIntent.droppedTaxonomySkills.length,
      strictSkills: finalIntent.strictSkills,
      boostSkills: finalIntent.boostSkills,
      subjectHints: finalIntent.subjectHints,
      strictSkillFilters: finalIntent.strictSkillFilters,
      boostSkillFilters: finalIntent.boostSkillFilters,
      xpertUsed: !!xpertRawResponse,
      xpertSystemPrompt: xpertDebug?.systemPrompt,
      xpertRawResponse: xpertDebug?.rawResponse,
      xpertDurationMs: xpertDebug?.durationMs,
      xpertSuccess: xpertDebug?.success,
      xpertDiscovery,
      xpertWasDiscoveryUsed,

    };

    const translation: CatalogTranslation = {
      ...finalIntent,
      skillProvenance,
      algoliaPrimaryRequest: {},
      algoliaFallbackRequests: [],
    };

    return { translation, trace };
  },

  /**
   * Flattens the catalog facet snapshot into a single set for fast lookup.
   *
   * @param facetSnapshot The structured facet data from Algolia.
   * @returns A set containing all valid skill names and subjects.
   */
  buildValidFacetSet(facetSnapshot: CatalogFacetSnapshot): Set<string> {
    const valid = new Set<string>();
    facetSnapshot.skill_names.forEach((s) => valid.add(s));
    facetSnapshot['skills.name'].forEach((s) => valid.add(s));
    facetSnapshot.subjects.forEach((s) => valid.add(s));
    return valid;
  },

  /**
   * Safely parses the AI's JSON response, handling potential markdown markers.
   *
   * @param raw The raw string from Xpert.
   * @returns A parsed object or null if parsing fails.
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
   * Merges deterministic and AI-driven mapping events into a single provenance list.
   *
   * @param rulesFirst History of exact and alias matches.
   * @param xpertProvenance History of AI-driven matches.
   * @returns A deduplicated list of skill provenance entries.
   */
  buildSkillProvenance(rulesFirst: RulesFirstCandidates, xpertProvenance: SkillProvenance[]): SkillProvenance[] {
    const provenance: SkillProvenance[] = [];
    rulesFirst.exactSkillFilters.forEach((match) => {
      provenance.push({
        taxonomySkill: match.taxonomySkill,
        catalogMatch: match.catalogSkill,
        catalogField: match.catalogField,
        matchMethod: 'exact',
      });
    });

    rulesFirst.aliasSkillFilters.forEach((match) => {
      provenance.push({
        taxonomySkill: match.taxonomySkill,
        catalogMatch: match.catalogSkill,
        catalogField: match.catalogField,
        matchMethod: 'alias',
      });
    });

    // Process deterministic matches.
    rulesFirst.exactMatches.forEach((match) => {
      provenance.push({ taxonomySkill: match, catalogMatch: match, matchMethod: 'exact' });
    });

    rulesFirst.aliasMatches.forEach((match) => {
      provenance.push({ taxonomySkill: match, catalogMatch: match, matchMethod: 'alias' });
    });

    // Merge AI mapping data, avoiding duplication of existing matches.
    xpertProvenance.forEach((xp) => {
      if (!provenance.some((p) => p.taxonomySkill === xp.taxonomySkill)) {
        provenance.push(xp);
      }
    });

    return provenance;
  },
};
