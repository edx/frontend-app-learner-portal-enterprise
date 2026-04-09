import { catalogTranslationService } from '../catalogTranslationService';
import { CatalogFacetSnapshot, RulesFirstCandidates } from '../../types';

describe('catalogTranslationService', () => {
  const mockFacetSnapshot: CatalogFacetSnapshot = {
    skill_names: ['Python', 'SQL', 'Data Analysis'],
    'skills.name': ['Python Programming'],
    subjects: ['Computer Science', 'Data Science'],
    level_type: ['Beginner'],
    'partners.name': ['edX'],
    enterprise_catalog_query_uuids: ['uuid-1'],
  };

  const mockRulesFirst: RulesFirstCandidates = {
    exactMatches: ['Python'],
    aliasMatches: ['SQL'],
    unmatched: ['UnknownSkill'],
  };

  describe('processTranslation', () => {
    it('returns valid CatalogTranslation using rules-first matches when Xpert is absent', () => {
      const result = catalogTranslationService.processTranslation(
        'Data Scientist',
        mockFacetSnapshot,
        mockRulesFirst,
      );

      expect(result.query).toBe('Data Scientist');
      expect(result.strictSkills).toContain('Python');
      expect(result.strictSkills).toContain('SQL');
      expect(result.skillProvenance).toHaveLength(2);
      expect(result.skillProvenance).toContainEqual({
        taxonomySkill: 'Python',
        catalogMatch: 'Python',
        matchMethod: 'exact',
      });
    });

    it('merges and grounds Xpert response correctly', () => {
      const xpertResponse = JSON.stringify({
        query: 'Refined Query',
        strictSkills: ['Data Analysis', 'InvalidSkill'],
        boostSkills: ['SQL'],
        subjectHints: ['Data Science'],
        droppedTaxonomySkills: ['UnknownSkill'],
        skillProvenance: [
          { taxonomySkill: 'UnknownSkill', catalogMatch: null, matchMethod: 'none' },
        ],
      });

      const result = catalogTranslationService.processTranslation(
        'Data Scientist',
        mockFacetSnapshot,
        mockRulesFirst,
        xpertResponse,
      );

      expect(result.query).toBe('Refined Query');
      // 'Data Analysis' is valid, 'InvalidSkill' is dropped
      expect(result.strictSkills).toContain('Data Analysis');
      expect(result.strictSkills).not.toContain('InvalidSkill');
      // Rules-first 'Python' and 'SQL' should still be there (unless capped)
      expect(result.strictSkills).toContain('Python');
      expect(result.strictSkills).toContain('SQL');

      expect(result.boostSkills).toEqual(['SQL']);
      expect(result.subjectHints).toEqual(['Data Science']);
    });

    it('falls back to rules-first if Xpert JSON is invalid', () => {
      const result = catalogTranslationService.processTranslation(
        'Data Scientist',
        mockFacetSnapshot,
        mockRulesFirst,
        'invalid json',
      );

      expect(result.query).toBe('Data Scientist');
      expect(result.strictSkills).toContain('Python');
    });

    it('caps skill counts', () => {
      const manySkills = Array(20).fill(0).map((_, i) => `Skill ${i}`);
      const snapshot: CatalogFacetSnapshot = {
        ...mockFacetSnapshot,
        skill_names: [...mockFacetSnapshot.skill_names, ...manySkills],
      };

      const xpertResponse = JSON.stringify({
        strictSkills: manySkills,
      });

      const result = catalogTranslationService.processTranslation(
        'Title',
        snapshot,
        { exactMatches: [], aliasMatches: [], unmatched: [] },
        xpertResponse,
      );

      expect(result.strictSkills.length).toBeLessThanOrEqual(8);
    });

    it('handles markdown fences in Xpert response', () => {
      const xpertResponse = '```json\n{"query": "Markdown Query"}\n```';
      const result = catalogTranslationService.processTranslation(
        'Title',
        mockFacetSnapshot,
        mockRulesFirst,
        xpertResponse,
      );
      expect(result.query).toBe('Markdown Query');
    });
  });
});
