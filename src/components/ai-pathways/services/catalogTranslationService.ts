import {
  RulesFirstCandidates,
  CatalogTranslation,
  CatalogSearchIntent,
  SkillProvenance,
  CatalogTranslationTrace,
  LearnerLevel,
  CatalogSkillMatch,
} from '../types';
import {
  MAX_STRICT_SKILLS,
  MAX_BOOST_SKILLS,
  BEGINNER_MAX_STRICT_SKILLS,
} from '../constants';

/**
 * Service for consolidating deterministic taxonomy-to-catalog mapping results.
 *
 * Pipeline context: This is the 'catalogTranslation' stage. It takes the output
 * of the rules-first deterministic mapping and produces a CatalogTranslation
 * ready for the hybrid retrieval ladder.
 *
 * With tiering:
 *   strictSkillFilters = broad_anchor skills → hard facetFilters
 *   boostSkillFilters  = role_differentiator + narrow_signal → optionalFilters
 *   query              = broadTerms from intentRequiredSkills (or broad anchors)
 *
 * Without tiering (legacy / no tier metadata):
 *   falls back to original behavior (all matches → strictSkillFilters)
 */
export const catalogTranslationService = {
  processTranslation(
    careerTitle: string,
    rulesFirst: RulesFirstCandidates,
    options: { learnerLevel?: LearnerLevel; intentRequiredSkills?: string[] } = {},
  ): { translation: CatalogTranslation; trace: CatalogTranslationTrace } {
    const allMatches: CatalogSkillMatch[] = [
      ...rulesFirst.exactSkillFilters,
      ...rulesFirst.aliasSkillFilters,
    ];

    const broadAnchors = allMatches
      .filter((m) => m.tier === 'broad_anchor')
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

    const boosters = allMatches
      .filter((m) => m.tier === 'role_differentiator' || m.tier === 'narrow_signal')
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

    // Legacy path: no tier info attached (e.g., old test data or missing skillDetails)
    const noTierMatches = allMatches.filter((m) => !m.tier);

    const maxStrict = options.learnerLevel === 'beginner' ? BEGINNER_MAX_STRICT_SKILLS : MAX_STRICT_SKILLS;

    let strictSkillFilters: CatalogSkillMatch[];
    let boostSkillFilters: CatalogSkillMatch[];

    if (broadAnchors.length > 0) {
      strictSkillFilters = broadAnchors.slice(0, maxStrict);
      boostSkillFilters = boosters.slice(0, MAX_BOOST_SKILLS);
    } else if (noTierMatches.length > 0) {
      // Legacy: preserve old behavior when no tiering info is present
      strictSkillFilters = noTierMatches.slice(0, maxStrict);
      boostSkillFilters = [];
    } else {
      // Only role_differentiators/narrow_signals available — allow up to 2 into strict
      const roleStrict = options.learnerLevel === 'beginner'
        ? boosters.filter((m) => m.tier === 'role_differentiator').slice(0, 2)
        : boosters.slice(0, 2);
      strictSkillFilters = roleStrict;
      boostSkillFilters = boosters.slice(roleStrict.length, roleStrict.length + MAX_BOOST_SKILLS);
    }

    // Build query from broad required skills or career title
    const broadTerms = options.intentRequiredSkills?.length
      ? options.intentRequiredSkills.slice(0, 3).map((s) => s.toLowerCase()).join(' ')
      : strictSkillFilters.slice(0, 3).map((f) => f.catalogSkill.toLowerCase()).join(' ');
    const query = broadTerms || careerTitle;
    const queryAlternates = query !== careerTitle ? [careerTitle] : [];

    const hasMappedFacets = strictSkillFilters.length > 0 || boostSkillFilters.length > 0;

    let courseSearchMode: CatalogTranslationTrace['courseSearchMode'];
    if (strictSkillFilters.length > 0 && boostSkillFilters.length > 0) {
      courseSearchMode = 'hybrid-broad';
    } else if (strictSkillFilters.length > 0 && boostSkillFilters.length === 0) {
      courseSearchMode = 'facet-first';
    } else if (strictSkillFilters.length === 0 && boostSkillFilters.length > 0) {
      courseSearchMode = 'text-boost';
    } else {
      courseSearchMode = 'text-fallback';
    }

    const finalIntent: CatalogSearchIntent = {
      query: hasMappedFacets ? query : careerTitle,
      queryAlternates: hasMappedFacets ? queryAlternates : [],
      strictSkillFilters,
      boostSkillFilters,
      droppedTaxonomySkills: [...rulesFirst.unmatched],
    };

    const skillProvenance = this.buildSkillProvenance(rulesFirst);

    const totalInputSkills = rulesFirst.exactSkillFilters.length
      + rulesFirst.aliasSkillFilters.length
      + rulesFirst.unmatched.length;

    const trace: CatalogTranslationTrace = {
      query: finalIntent.query,
      queryAlternates: finalIntent.queryAlternates,
      strictSkillCount: strictSkillFilters.length,
      boostSkillCount: boostSkillFilters.length,
      droppedSkillCount: finalIntent.droppedTaxonomySkills.length,
      strictSkills: strictSkillFilters.map((f) => f.catalogSkill),
      boostSkills: boostSkillFilters.map((f) => f.catalogSkill),
      strictSkillFilters,
      boostSkillFilters,
      courseSearchMode,
      facetMatchCount: allMatches.length,
      facetMatchRate: totalInputSkills > 0
        ? Math.round((allMatches.length / totalInputSkills) * 100) / 100
        : 0,
    };

    const translation: CatalogTranslation = {
      ...finalIntent,
      skillProvenance,
      learnerLevel: options.learnerLevel,
    };

    return { translation, trace };
  },

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
