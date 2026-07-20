import { translateSkillsToCatalog } from './catalogSkillTranslation';
import type { CatalogFacetSnapshot, CourseSearchOptions } from '../types';

const emptyFacetSnapshot: CatalogFacetSnapshot = {
  skill_names: [],
  'skills.name': [],
  subjects: [],
};

const baseOptions = (overrides: Partial<CourseSearchOptions> = {}): CourseSearchOptions => ({
  selectedCareer: { title: 'Data Analyst', skillsToDevelop: [] },
  intent: {
    skillsRequired: [],
    skillsPreferred: [],
  },
  catalogScope: { searchCatalogs: [], catalogUuidsToCatalogQueryUuids: {} },
  ...overrides,
});

describe('translateSkillsToCatalog', () => {
  describe('dedup priority', () => {
    it('keeps a skill as strict when it appears in both required and preferred/career lists', () => {
      const options = baseOptions({
        intent: {
          skillsRequired: ['SQL'], skillsPreferred: ['SQL'],
        },
        selectedCareer: { title: 'Data Analyst', skillsToDevelop: ['SQL'] },
      });
      const facetSnapshot: CatalogFacetSnapshot = { ...emptyFacetSnapshot, skill_names: ['SQL'] };

      const translation = translateSkillsToCatalog(options, facetSnapshot);

      expect(translation.strictSkillFilters).toEqual([{ catalogSkill: 'SQL', catalogField: 'skill_names' }]);
      expect(translation.boostSkillFilters).toEqual([]);
    });

    it('deduplicates a skill appearing in both preferred and career lists, keeping it once', () => {
      const options = baseOptions({
        intent: {
          skillsRequired: [], skillsPreferred: ['Excel'],
        },
        selectedCareer: { title: 'Data Analyst', skillsToDevelop: ['Excel'] },
      });
      const facetSnapshot: CatalogFacetSnapshot = { ...emptyFacetSnapshot, skill_names: ['Excel'] };

      const translation = translateSkillsToCatalog(options, facetSnapshot);

      // Only one grounded signal total (deduped), and zero strict signals survive
      // grounding, so fallback promotion lifts this single boost match to strict.
      expect(translation.strictSkillFilters).toEqual([{ catalogSkill: 'Excel', catalogField: 'skill_names' }]);
      expect(translation.boostSkillFilters).toEqual([]);
    });
  });

  describe('malformed compound exclusion', () => {
    it('drops skills containing " & " or " + " entirely, from any source', () => {
      const options = baseOptions({
        intent: {
          skillsRequired: ['SQL & Python', 'Excel + Tableau'], skillsPreferred: [],
        },
      });
      const facetSnapshot: CatalogFacetSnapshot = { ...emptyFacetSnapshot, skill_names: ['SQL & Python', 'Excel + Tableau'] };

      const translation = translateSkillsToCatalog(options, facetSnapshot);

      expect(translation.strictSkillFilters).toEqual([]);
      expect(translation.boostSkillFilters).toEqual([]);
    });
  });

  describe('exact-match field priority', () => {
    it('prefers skill_names over skills.name when a term is present in both', () => {
      const options = baseOptions({
        intent: { skillsRequired: ['SQL'], skillsPreferred: [] },
      });
      const facetSnapshot: CatalogFacetSnapshot = {
        ...emptyFacetSnapshot, skill_names: ['SQL'], 'skills.name': ['SQL'],
      };

      const translation = translateSkillsToCatalog(options, facetSnapshot);

      expect(translation.strictSkillFilters).toEqual([{ catalogSkill: 'SQL', catalogField: 'skill_names' }]);
    });

    it('falls back to skills.name when a term only exists there', () => {
      const options = baseOptions({
        intent: { skillsRequired: ['Agile'], skillsPreferred: [] },
      });
      const facetSnapshot: CatalogFacetSnapshot = { ...emptyFacetSnapshot, 'skills.name': ['Agile'] };

      const translation = translateSkillsToCatalog(options, facetSnapshot);

      expect(translation.strictSkillFilters).toEqual([{ catalogSkill: 'Agile', catalogField: 'skills.name' }]);
    });

    it('is case-insensitive and preserves the catalog\'s original casing', () => {
      const options = baseOptions({
        intent: { skillsRequired: ['sql'], skillsPreferred: [] },
      });
      const facetSnapshot: CatalogFacetSnapshot = { ...emptyFacetSnapshot, skill_names: ['SQL'] };

      const translation = translateSkillsToCatalog(options, facetSnapshot);

      expect(translation.strictSkillFilters).toEqual([{ catalogSkill: 'SQL', catalogField: 'skill_names' }]);
    });
  });

  describe('no aliasing', () => {
    it('never resolves a term via aliasing, even when a plausible alias target is catalog-valid', () => {
      const options = baseOptions({
        intent: { skillsRequired: ['python'], skillsPreferred: [] },
      });
      const facetSnapshot: CatalogFacetSnapshot = {
        ...emptyFacetSnapshot, skill_names: ['Python (Programming Language)'],
      };

      const translation = translateSkillsToCatalog(options, facetSnapshot);

      expect(translation.strictSkillFilters).toEqual([]);
    });
  });

  describe('unmatched terms', () => {
    it('drops terms with no exact match, without affecting other resolvable signals', () => {
      const options = baseOptions({
        intent: {
          skillsRequired: ['SQL', 'Quantum Basket Weaving'], skillsPreferred: [],
        },
      });
      const facetSnapshot: CatalogFacetSnapshot = { ...emptyFacetSnapshot, skill_names: ['SQL'] };

      const translation = translateSkillsToCatalog(options, facetSnapshot);

      expect(translation.strictSkillFilters).toEqual([{ catalogSkill: 'SQL', catalogField: 'skill_names' }]);
    });
  });

  describe('strict cap by learner level', () => {
    const facetSnapshot: CatalogFacetSnapshot = {
      ...emptyFacetSnapshot, skill_names: ['A', 'B', 'C', 'D', 'E'],
    };

    it('caps strict skills at 4 for non-introductory (or unset) learner levels', () => {
      const options = baseOptions({
        intent: {
          skillsRequired: ['A', 'B', 'C', 'D', 'E'], skillsPreferred: [],
        },
      });

      const translation = translateSkillsToCatalog(options, facetSnapshot);

      expect(translation.strictSkillFilters).toHaveLength(4);
    });

    it('caps strict skills at 3 for introductory learners', () => {
      const options = baseOptions({
        intent: {
          skillsRequired: ['A', 'B', 'C', 'D', 'E'], skillsPreferred: [], learnerLevel: 'introductory',
        },
      });

      const translation = translateSkillsToCatalog(options, facetSnapshot);

      expect(translation.strictSkillFilters).toHaveLength(3);
    });
  });

  describe('boost cap', () => {
    it('caps boost skills at 8', () => {
      const nineSkills = Array.from({ length: 9 }, (_, i) => `Skill${i}`);
      const options = baseOptions({
        intent: { skillsRequired: ['SQL'], skillsPreferred: nineSkills },
      });
      const facetSnapshot: CatalogFacetSnapshot = { ...emptyFacetSnapshot, skill_names: ['SQL', ...nineSkills] };

      const translation = translateSkillsToCatalog(options, facetSnapshot);

      expect(translation.boostSkillFilters).toHaveLength(8);
    });
  });

  describe('fallback promotion', () => {
    it('promotes up to 2 boost matches to strict when zero strict matches survive grounding', () => {
      const options = baseOptions({
        intent: {
          skillsRequired: ['Unmatched Required Skill'], skillsPreferred: ['Excel', 'Tableau', 'Power BI'],
        },
      });
      const facetSnapshot: CatalogFacetSnapshot = {
        ...emptyFacetSnapshot, skill_names: ['Excel', 'Tableau', 'Power BI'],
      };

      const translation = translateSkillsToCatalog(options, facetSnapshot);

      expect(translation.strictSkillFilters).toEqual([
        { catalogSkill: 'Excel', catalogField: 'skill_names' },
        { catalogSkill: 'Tableau', catalogField: 'skill_names' },
      ]);
      expect(translation.boostSkillFilters).toEqual([{ catalogSkill: 'Power BI', catalogField: 'skill_names' }]);
    });

    it('leaves both empty when neither strict nor boost signals ground to anything', () => {
      const options = baseOptions({
        intent: { skillsRequired: ['Nope'], skillsPreferred: ['AlsoNope'] },
      });

      const translation = translateSkillsToCatalog(options, emptyFacetSnapshot);

      expect(translation.strictSkillFilters).toEqual([]);
      expect(translation.boostSkillFilters).toEqual([]);
    });
  });

  describe('query and alternate derivation', () => {
    it('derives the query from required skills (lowercased, top 3, joined) when present', () => {
      const options = baseOptions({
        intent: {
          skillsRequired: ['SQL', 'Python', 'Excel', 'Tableau'], skillsPreferred: [],
        },
      });

      const translation = translateSkillsToCatalog(options, emptyFacetSnapshot);

      expect(translation.query).toBe('sql python excel');
    });

    it('falls back to top-3 strict catalog skill names when there are no required skills', () => {
      const options = baseOptions({
        intent: { skillsRequired: [], skillsPreferred: ['Excel', 'Tableau'] },
      });
      const facetSnapshot: CatalogFacetSnapshot = { ...emptyFacetSnapshot, skill_names: ['Excel', 'Tableau'] };

      const translation = translateSkillsToCatalog(options, facetSnapshot);

      expect(translation.query).toBe('excel tableau');
    });

    it('falls back to the selected career title when nothing else resolves', () => {
      const options = baseOptions({
        intent: { skillsRequired: [], skillsPreferred: [] },
        selectedCareer: { title: 'Data Analyst', skillsToDevelop: [] },
      });

      const translation = translateSkillsToCatalog(options, emptyFacetSnapshot);

      expect(translation.query).toBe('Data Analyst');
      expect(translation.queryAlternates).toEqual([]);
    });

    it('includes the career title as a query alternate only when the chosen query differs from it', () => {
      const options = baseOptions({
        intent: { skillsRequired: ['SQL'], skillsPreferred: [] },
        selectedCareer: { title: 'Data Analyst', skillsToDevelop: [] },
      });

      const translation = translateSkillsToCatalog(options, emptyFacetSnapshot);

      expect(translation.query).toBe('sql');
      expect(translation.queryAlternates).toEqual(['Data Analyst']);
    });
  });
});
