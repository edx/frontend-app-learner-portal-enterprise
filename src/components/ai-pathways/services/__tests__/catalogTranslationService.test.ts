import { catalogTranslationService } from '../catalogTranslationService';
import { RulesFirstCandidates } from '../../types';

describe('catalogTranslationService', () => {
  const mockRulesFirstWithMatches: RulesFirstCandidates = {
    exactMatches: ['Python', 'SQL'],
    aliasMatches: ['Data Analysis'],
    exactSkillFilters: [
      {
        taxonomySkill: 'Python', catalogSkill: 'Python', catalogField: 'skill_names', matchMethod: 'exact',
      },
      {
        taxonomySkill: 'SQL', catalogSkill: 'SQL', catalogField: 'skill_names', matchMethod: 'exact',
      },
    ],
    aliasSkillFilters: [
      {
        taxonomySkill: 'Data Analysis', catalogSkill: 'Data Analysis', catalogField: 'skill_names', matchMethod: 'alias',
      },
    ],
    unmatched: ['UnknownSkill'],
  };

  const mockRulesFirstNoMatches: RulesFirstCandidates = {
    exactMatches: [],
    aliasMatches: [],
    exactSkillFilters: [],
    aliasSkillFilters: [],
    unmatched: ['ObscureTechA', 'ObscureTechB'],
  };

  describe('processTranslation — facet-first mode', () => {
    it('sets query to empty string when skills are mapped', () => {
      const { translation } = catalogTranslationService.processTranslation(
        'Data Scientist',
        mockRulesFirstWithMatches,
      );
      expect(translation.query).toBe('');
    });

    it('sets queryAlternates to [careerTitle] when skills are mapped', () => {
      const { translation } = catalogTranslationService.processTranslation(
        'Data Scientist',
        mockRulesFirstWithMatches,
      );
      expect(translation.queryAlternates).toEqual(['Data Scientist']);
    });

    it('populates strictSkillFilters from both exact and alias matches', () => {
      const { translation } = catalogTranslationService.processTranslation(
        'Data Scientist',
        mockRulesFirstWithMatches,
      );
      expect(translation.strictSkillFilters).toHaveLength(3);
      expect(translation.strictSkillFilters.map(f => f.catalogSkill)).toContain('Python');
      expect(translation.strictSkillFilters.map(f => f.catalogSkill)).toContain('SQL');
      expect(translation.strictSkillFilters.map(f => f.catalogSkill)).toContain('Data Analysis');
    });

    it('puts unmatched skills in droppedTaxonomySkills', () => {
      const { translation } = catalogTranslationService.processTranslation(
        'Data Scientist',
        mockRulesFirstWithMatches,
      );
      expect(translation.droppedTaxonomySkills).toContain('UnknownSkill');
    });

    it('builds skillProvenance with correct matchMethod entries', () => {
      const { translation } = catalogTranslationService.processTranslation(
        'Data Scientist',
        mockRulesFirstWithMatches,
      );
      expect(translation.skillProvenance).toContainEqual({
        taxonomySkill: 'Python',
        catalogMatch: 'Python',
        catalogField: 'skill_names',
        matchMethod: 'exact',
      });
      expect(translation.skillProvenance).toContainEqual({
        taxonomySkill: 'UnknownSkill',
        matchMethod: 'none',
      });
    });

    it('sets courseSearchMode to facet-first in trace', () => {
      const { trace } = catalogTranslationService.processTranslation(
        'Data Scientist',
        mockRulesFirstWithMatches,
      );
      expect(trace.courseSearchMode).toBe('facet-first');
    });

    it('reports correct facetMatchCount and facetMatchRate', () => {
      const { trace } = catalogTranslationService.processTranslation(
        'Data Scientist',
        mockRulesFirstWithMatches,
      );
      expect(trace.facetMatchCount).toBe(3);
      // 3 matched of 4 total (3 matched + 1 unmatched)
      expect(trace.facetMatchRate).toBeCloseTo(0.75);
    });
  });

  describe('processTranslation — text-fallback mode', () => {
    it('sets query to careerTitle when no skills are mapped', () => {
      const { translation } = catalogTranslationService.processTranslation(
        'Quantum Engineer',
        mockRulesFirstNoMatches,
      );
      expect(translation.query).toBe('Quantum Engineer');
    });

    it('sets queryAlternates to [] when no skills are mapped', () => {
      const { translation } = catalogTranslationService.processTranslation(
        'Quantum Engineer',
        mockRulesFirstNoMatches,
      );
      expect(translation.queryAlternates).toEqual([]);
    });

    it('sets courseSearchMode to text-fallback in trace', () => {
      const { trace } = catalogTranslationService.processTranslation(
        'Quantum Engineer',
        mockRulesFirstNoMatches,
      );
      expect(trace.courseSearchMode).toBe('text-fallback');
    });

    it('reports facetMatchCount of 0 and facetMatchRate of 0 when nothing matches', () => {
      const { trace } = catalogTranslationService.processTranslation(
        'Quantum Engineer',
        mockRulesFirstNoMatches,
      );
      expect(trace.facetMatchCount).toBe(0);
      expect(trace.facetMatchRate).toBe(0);
    });
  });

  describe('processTranslation — skill capping', () => {
    it('caps strictSkillFilters at MAX_STRICT_SKILLS (8)', () => {
      const manyFilters = Array(12).fill(0).map((_, i) => ({
        taxonomySkill: `Skill ${i}`,
        catalogSkill: `Skill ${i}`,
        catalogField: 'skill_names' as const,
        matchMethod: 'exact' as const,
      }));
      const heavyRulesFirst: RulesFirstCandidates = {
        exactMatches: manyFilters.map(f => f.catalogSkill),
        aliasMatches: [],
        exactSkillFilters: manyFilters,
        aliasSkillFilters: [],
        unmatched: [],
      };

      const { translation } = catalogTranslationService.processTranslation('Engineer', heavyRulesFirst);
      expect(translation.strictSkillFilters.length).toBeLessThanOrEqual(8);
    });
  });
});
