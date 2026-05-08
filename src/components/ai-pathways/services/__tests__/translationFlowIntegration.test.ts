import { catalogTranslationRules } from '../catalogTranslationRules';
import { catalogTranslationService } from '../catalogTranslationService';
import { courseRetrievalService } from '../courseRetrieval';
import { CatalogFacetSnapshot, TaxonomyTranslationInput } from '../../types';

const mockSearch = jest.fn();
const mockInitIndex = jest.fn(() => ({ search: mockSearch }));
jest.mock('algoliasearch', () => jest.fn(() => ({ initIndex: mockInitIndex })));

jest.mock('@edx/frontend-platform/config', () => ({
  getConfig: jest.fn(() => ({
    ALGOLIA_APP_ID: 'test-app-id',
    ALGOLIA_SEARCH_API_KEY: 'test-key',
    ALGOLIA_INDEX_NAME: 'test-index',
  })),
}));

describe('Translation and Retrieval Integration Flow', () => {
  const mockFacetSnapshot: CatalogFacetSnapshot = {
    skill_names: ['Python (Programming Language)', 'Data Analysis', 'SQL (Programming Language)'],
    'skills.name': ['Python Programming'],
    subjects: ['Computer Science', 'Data Science'],
    level_type: ['Beginner'],
    'partners.name': ['edX'],
    enterprise_catalog_query_uuids: ['uuid-1'],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const baseInput: TaxonomyTranslationInput = {
    careerTitle: 'Data Analyst',
    skills: [],
    industries: [],
    similarJobs: [],
    facetSnapshot: mockFacetSnapshot,
  };

  it('exact skill mapping: matches taxonomy skill directly to catalog facet, uses facet-first', async () => {
    const input = { ...baseInput, skills: ['Data Analysis'] };

    const { result: rulesResult } = catalogTranslationRules.translateTaxonomyToCatalog(input);
    expect(rulesResult.exactMatches).toContain('Data Analysis');

    const { translation, trace } = catalogTranslationService.processTranslation(
      input.careerTitle,
      rulesResult,
    );
    expect(translation.query).toBe('');
    expect(translation.strictSkillFilters.map(f => f.catalogSkill)).toContain('Data Analysis');
    expect(trace.courseSearchMode).toBe('facet-first');

    mockSearch.mockResolvedValueOnce({
      hits: Array(3).fill({ objectID: 'c1', title: 'Data Analysis Course' }),
    });

    const { courses, ladderTrace } = await courseRetrievalService.fetchCourses(translation);

    expect(mockSearch).toHaveBeenCalledTimes(1);
    expect(mockSearch).toHaveBeenCalledWith('', expect.objectContaining({
      facetFilters: expect.arrayContaining([
        expect.arrayContaining(['skill_names:"Data Analysis"']),
      ]),
    }));
    expect(courses).toHaveLength(3);
    expect(ladderTrace.winnerStep).toBe(1);
  });

  it('alias mapping: maps "Python" to "Python (Programming Language)" via alias map', async () => {
    const input = { ...baseInput, skills: ['Python'] };

    const { result: rulesResult } = catalogTranslationRules.translateTaxonomyToCatalog(input);
    expect(rulesResult.aliasMatches).toContain('Python (Programming Language)');

    const { translation, trace } = catalogTranslationService.processTranslation(
      input.careerTitle,
      rulesResult,
    );
    expect(translation.strictSkillFilters.map(f => f.catalogSkill)).toContain('Python (Programming Language)');
    expect(trace.courseSearchMode).toBe('facet-first');

    mockSearch.mockResolvedValueOnce({
      hits: Array(3).fill({ objectID: 'c1', title: 'Python Course' }),
    });

    const { courses } = await courseRetrievalService.fetchCourses(translation);

    expect(courses).toHaveLength(3);
  });

  it('no skill mapping: falls back to text-fallback mode using careerTitle', async () => {
    const input = { ...baseInput, skills: ['ObscureTechNotInCatalog'] };

    const { result: rulesResult } = catalogTranslationRules.translateTaxonomyToCatalog(input);

    const { translation, trace } = catalogTranslationService.processTranslation(
      input.careerTitle,
      rulesResult,
    );
    expect(translation.query).toBe('Data Analyst');
    expect(translation.strictSkillFilters).toHaveLength(0);
    expect(trace.courseSearchMode).toBe('text-fallback');
  });

  it('step 1 fails, step 2 succeeds with reduced facet filters', async () => {
    const input = { ...baseInput, skills: ['Data Analysis', 'SQL'] };

    const { result: rulesResult } = catalogTranslationRules.translateTaxonomyToCatalog(input);
    const { translation } = catalogTranslationService.processTranslation(
      input.careerTitle,
      rulesResult,
    );

    mockSearch.mockResolvedValueOnce({ hits: [] }); // step 1: miss
    mockSearch.mockResolvedValueOnce({ hits: Array(4).fill({ objectID: 'c2', title: 'Course' }) }); // step 2: hit

    const { courses, ladderTrace } = await courseRetrievalService.fetchCourses(translation);

    expect(courses).toHaveLength(4);
    expect(ladderTrace.winnerStep).toBe(2);

    // Step 2 must use facetFilters (not optionalFilters)
    const step2Call = mockSearch.mock.calls[1];
    expect(step2Call[1]).toHaveProperty('facetFilters');
    expect(step2Call[1]).not.toHaveProperty('optionalFilters');
  });

  it('scope-only final fallback: all specific levels fail, returns scope-only results', async () => {
    const input = { ...baseInput, skills: ['Data Analysis'] };
    const { result: rulesResult } = catalogTranslationRules.translateTaxonomyToCatalog(input);
    const { translation } = catalogTranslationService.processTranslation(input.careerTitle, rulesResult);

    // Exhaust all steps
    mockSearch
      .mockResolvedValueOnce({ hits: [] }) // step 1
      .mockResolvedValueOnce({ hits: [] }) // step 2
      .mockResolvedValueOnce({ hits: [] }) // step 3 text fallback
      .mockResolvedValueOnce({ hits: Array(2).fill({ objectID: 'f1', title: 'Fallback Course' }) }); // step 4

    const { courses, ladderTrace } = await courseRetrievalService.fetchCourses(translation);

    expect(courses[0].title).toBe('Fallback Course');
    expect(ladderTrace.winnerStep).toBe(4);
  });
});
