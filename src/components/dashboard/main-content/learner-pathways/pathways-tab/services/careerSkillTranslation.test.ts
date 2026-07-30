import { translateCareerSkillsToCatalog } from './careerSkillTranslation';
import type { CareerFacetSnapshot, CareerSearchIntent } from '../types';

const baseIntent = (overrides: Partial<CareerSearchIntent> = {}): CareerSearchIntent => ({
  condensedAlgoliaQuery: '',
  skillsRequired: [],
  skillsPreferred: [],
  ...overrides,
});

describe('translateCareerSkillsToCatalog', () => {
  it('grounds required skills as strict and preferred skills as boost, independently', () => {
    const facetSnapshot: CareerFacetSnapshot = { 'skills.name': ['Performance Art', 'Comedy', 'Physical Theater'] };
    const intent = baseIntent({
      skillsRequired: ['Performance Art', 'Comedy'],
      skillsPreferred: ['Physical Theater'],
    });

    const result = translateCareerSkillsToCatalog(intent, facetSnapshot);

    expect(result.strictSkillFilters).toEqual([
      { catalogSkill: 'Performance Art', catalogField: 'skills.name' },
      { catalogSkill: 'Comedy', catalogField: 'skills.name' },
    ]);
    expect(result.boostSkillFilters).toEqual([
      { catalogSkill: 'Physical Theater', catalogField: 'skills.name' },
    ]);
  });

  it('drops a skill that does not ground against the facet snapshot', () => {
    const facetSnapshot: CareerFacetSnapshot = { 'skills.name': ['SQL'] };
    const intent = baseIntent({ skillsRequired: ['SQL', 'NotInTaxonomy'] });

    const result = translateCareerSkillsToCatalog(intent, facetSnapshot);

    expect(result.strictSkillFilters).toEqual([{ catalogSkill: 'SQL', catalogField: 'skills.name' }]);
  });

  it('caps required (strict) skills at 4 and preferred (boost) skills at 2', () => {
    const facetSnapshot: CareerFacetSnapshot = {
      'skills.name': ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'],
    };
    const intent = baseIntent({
      skillsRequired: ['A', 'B', 'C', 'D', 'E'],
      skillsPreferred: ['F', 'G', 'H'],
    });

    const result = translateCareerSkillsToCatalog(intent, facetSnapshot);

    expect(result.strictSkillFilters).toHaveLength(4);
    expect(result.boostSkillFilters).toHaveLength(2);
  });

  it('suppresses preferred (boost) skills entirely for introductory learners', () => {
    const facetSnapshot: CareerFacetSnapshot = { 'skills.name': ['SQL', 'AWS'] };
    const intent = baseIntent({
      learnerLevel: 'introductory',
      skillsRequired: ['SQL'],
      skillsPreferred: ['AWS'],
    });

    const result = translateCareerSkillsToCatalog(intent, facetSnapshot);

    expect(result.strictSkillFilters).toEqual([{ catalogSkill: 'SQL', catalogField: 'skills.name' }]);
    expect(result.boostSkillFilters).toEqual([]);
  });

  it('promotes a boost skill to strict when zero required skills ground to anything', () => {
    const facetSnapshot: CareerFacetSnapshot = { 'skills.name': ['AWS'] };
    const intent = baseIntent({ skillsPreferred: ['AWS'] });

    const result = translateCareerSkillsToCatalog(intent, facetSnapshot);

    expect(result.strictSkillFilters).toEqual([{ catalogSkill: 'AWS', catalogField: 'skills.name' }]);
    expect(result.boostSkillFilters).toEqual([]);
  });

  it('drops malformed compound skill strings and deduplicates case-insensitively', () => {
    const facetSnapshot: CareerFacetSnapshot = { 'skills.name': ['SQL'] };
    const intent = baseIntent({ skillsRequired: ['SQL & Python', 'SQL', 'sql'] });

    const result = translateCareerSkillsToCatalog(intent, facetSnapshot);

    expect(result.strictSkillFilters).toEqual([{ catalogSkill: 'SQL', catalogField: 'skills.name' }]);
  });

  it('returns empty strict and boost filters when no skills are provided', () => {
    const facetSnapshot: CareerFacetSnapshot = { 'skills.name': [] };

    const result = translateCareerSkillsToCatalog(baseIntent(), facetSnapshot);

    expect(result).toEqual({ strictSkillFilters: [], boostSkillFilters: [] });
  });

  it('never places the same skill in both the strict and boost groups', () => {
    const facetSnapshot: CareerFacetSnapshot = { 'skills.name': ['SQL'] };
    const intent = baseIntent({ skillsRequired: ['SQL'], skillsPreferred: ['SQL'] });

    const result = translateCareerSkillsToCatalog(intent, facetSnapshot);

    expect(result.strictSkillFilters).toEqual([{ catalogSkill: 'SQL', catalogField: 'skills.name' }]);
    expect(result.boostSkillFilters).toEqual([]);
  });
});
