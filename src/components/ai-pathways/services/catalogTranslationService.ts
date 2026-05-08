import {
  RulesFirstCandidates,
  CatalogTranslation,
  CatalogSearchIntent,
  SkillProvenance,
  CatalogTranslationTrace,
} from '../types';

/** Maximum number of hard skill filters to include in an Algolia request. */
const MAX_STRICT_SKILLS = 8;

/**
 * Service for consolidating deterministic taxonomy-to-catalog mapping results.
 *
 * Pipeline context: This is the 'catalogTranslation' stage. It takes the output
 * of the rules-first deterministic mapping and produces a CatalogTranslation
 * ready for the facet-first retrieval ladder.
 *
 * When mapped skill facets exist:
 *   query = ''       → Algolia retrieves by facet filters only
 *   queryAlternates  → [careerTitle] as text fallback for step 3 of the ladder
 *
 * When no skills map to catalog facets:
 *   query = careerTitle → text search fallback
 *   queryAlternates     → []
 */
export const catalogTranslationService = {
  /**
   * Produces a CatalogTranslation from deterministic rules-first mapping results.
   *
   * @param careerTitle The professional title chosen by the user.
   * @param rulesFirst The results from the deterministic mapping stage.
   * @returns A result object containing the final translation and a trace.
   */
  processTranslation(
    careerTitle: string,
    rulesFirst: RulesFirstCandidates,
  ): { translation: CatalogTranslation; trace: CatalogTranslationTrace } {
    const allSkillFilters = [
      ...rulesFirst.exactSkillFilters,
      ...rulesFirst.aliasSkillFilters,
    ].slice(0, MAX_STRICT_SKILLS);

    const hasMappedFacets = allSkillFilters.length > 0;
    const totalInputSkills = rulesFirst.exactSkillFilters.length
      + rulesFirst.aliasSkillFilters.length
      + rulesFirst.unmatched.length;

    const finalIntent: CatalogSearchIntent = {
      query: hasMappedFacets ? '' : careerTitle,
      queryAlternates: hasMappedFacets ? [careerTitle] : [],
      strictSkillFilters: allSkillFilters,
      boostSkillFilters: [],
      droppedTaxonomySkills: [...rulesFirst.unmatched],
    };

    const skillProvenance = this.buildSkillProvenance(rulesFirst);

    const trace: CatalogTranslationTrace = {
      query: finalIntent.query,
      queryAlternates: finalIntent.queryAlternates,
      strictSkillCount: allSkillFilters.length,
      boostSkillCount: 0,
      droppedSkillCount: finalIntent.droppedTaxonomySkills.length,
      strictSkills: allSkillFilters.map((f) => f.catalogSkill),
      boostSkills: [],
      strictSkillFilters: allSkillFilters,
      boostSkillFilters: [],
      courseSearchMode: hasMappedFacets ? 'facet-first' : 'text-fallback',
      facetMatchCount: allSkillFilters.length,
      facetMatchRate: totalInputSkills > 0
        ? Math.round((allSkillFilters.length / totalInputSkills) * 100) / 100
        : 0,
    };

    const translation: CatalogTranslation = {
      ...finalIntent,
      skillProvenance,
    };

    return { translation, trace };
  },

  /**
   * Builds the skill provenance list from deterministic mapping results.
   */
  buildSkillProvenance(rulesFirst: RulesFirstCandidates): SkillProvenance[] {
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

    rulesFirst.unmatched.forEach((skill) => {
      provenance.push({
        taxonomySkill: skill,
        matchMethod: 'none',
      });
    });

    return provenance;
  },
};
