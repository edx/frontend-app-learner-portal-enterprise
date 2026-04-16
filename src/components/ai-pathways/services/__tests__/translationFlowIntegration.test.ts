import { SearchIndex } from 'algoliasearch/lite';
import { catalogTranslationRules } from '../catalogTranslationRules';
import { catalogTranslationService } from '../catalogTranslationService';
import { courseRetrievalService } from '../courseRetrieval';
import { CatalogFacetSnapshot, TaxonomyTranslationInput } from '../../types';

describe('Translation and Retrieval Integration Flow', () => {
  const mockFacetSnapshot: CatalogFacetSnapshot = {
    skill_names: ['Python (Programming Language)', 'Data Analysis', 'SQL (Programming Language)'],
    'skills.name': ['Python Programming'],
    subjects: ['Computer Science', 'Data Science'],
    level_type: ['Beginner'],
    'partners.name': ['edX'],
    enterprise_catalog_query_uuids: ['uuid-1'],
  };

  const mockIndex = {
    search: jest.fn(),
  } as unknown as SearchIndex;

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

  it('exact skill mapping path: matches taxonomy skill directly to catalog facet and hits level 1', async () => {
    const input = { ...baseInput, skills: ['Data Analysis'] };

    const { result: rulesResult } = catalogTranslationRules.translateTaxonomyToCatalog(input);
    expect(rulesResult.exactMatches).toContain('Data Analysis');

    const { translation } = catalogTranslationService.processTranslation(
      input.careerTitle,
      mockFacetSnapshot,
      rulesResult,
    );
    expect(translation.strictSkills).toContain('Data Analysis');

    (mockIndex.search as jest.Mock).mockResolvedValueOnce({
      hits: Array(3).fill({ objectID: 'c1', title: 'Data Analysis Course' }),
    });

    const { courses } = await courseRetrievalService.fetchCourses(mockIndex, translation);

    expect(mockIndex.search).toHaveBeenCalledTimes(1);
    expect(courses).toHaveLength(3);
  });

  it('alias mapping path: maps "Python" to "Python (Programming Language)" and hits level 1', async () => {
    const input = { ...baseInput, skills: ['Python'] };

    const { result: rulesResult } = catalogTranslationRules.translateTaxonomyToCatalog(input);
    expect(rulesResult.aliasMatches).toContain('Python (Programming Language)');

    const { translation } = catalogTranslationService.processTranslation(
      input.careerTitle,
      mockFacetSnapshot,
      rulesResult,
    );
    expect(translation.strictSkills).toContain('Python (Programming Language)');

    (mockIndex.search as jest.Mock).mockResolvedValueOnce({
      hits: Array(3).fill({ objectID: 'c1', title: 'Python Course' }),
    });

    const { courses } = await courseRetrievalService.fetchCourses(mockIndex, translation);

    expect(mockIndex.search).toHaveBeenCalledTimes(1);
    expect(courses).toHaveLength(3);
  });

  it('invalid Xpert output fallback path: falls back to rules-first when Xpert fails and hits level 1', async () => {
    const input = { ...baseInput, skills: ['Data Analysis'] };
    const { result: rulesResult } = catalogTranslationRules.translateTaxonomyToCatalog(input);

    const { translation } = catalogTranslationService.processTranslation(
      input.careerTitle,
      mockFacetSnapshot,
      rulesResult,
      'Invalid JSON or Error string',
    );

    expect(translation.strictSkills).toContain('Data Analysis');
    expect(translation.query).toBe('Data Analyst');

    (mockIndex.search as jest.Mock).mockResolvedValueOnce({
      hits: Array(3).fill({ objectID: 'c1', title: 'Data Analysis Course' }),
    });

    const { courses } = await courseRetrievalService.fetchCourses(mockIndex, translation);
    expect(courses).toHaveLength(3);
  });

  it('zero-hit strict filter fallback path: level 1 fails, falls back to level 2 (boosted)', async () => {
    const input = { ...baseInput, skills: ['Data Analysis'] };
    const { result: rulesResult } = catalogTranslationRules.translateTaxonomyToCatalog(input);

    const xpertResponse = JSON.stringify({
      boostSkills: ['SQL (Programming Language)'],
    });

    const { translation } = catalogTranslationService.processTranslation(
      input.careerTitle,
      mockFacetSnapshot,
      rulesResult,
      xpertResponse,
    );

    expect(translation.boostSkills).toContain('SQL (Programming Language)');

    (mockIndex.search as jest.Mock).mockResolvedValueOnce({ hits: [] });
    (mockIndex.search as jest.Mock).mockResolvedValueOnce({
      hits: Array(3).fill({ objectID: 'c2', title: 'Boosted Course' }),
    });

    const { courses } = await courseRetrievalService.fetchCourses(mockIndex, translation);

    expect(mockIndex.search).toHaveBeenCalledTimes(2);
    expect(mockIndex.search).toHaveBeenLastCalledWith('Data Analyst', expect.objectContaining({
      optionalFilters: expect.arrayContaining(['skill_names:"SQL (Programming Language)"']),
    }));
    expect(courses).toHaveLength(3);
  });

  it('scope-only final fallback path: all specific levels fail, returns scope-only results', async () => {
    const translation: any = {
      query: 'Rare Job Title',
      queryAlternates: ['Alt 1'],
      strictSkills: ['Rare Skill'],
      boostSkills: [],
      subjectHints: [],
      droppedTaxonomySkills: [],
      skillProvenance: [],
    };

    (mockIndex.search as jest.Mock).mockResolvedValueOnce({ hits: [] }); // 1. Strict
    (mockIndex.search as jest.Mock).mockResolvedValueOnce({ hits: [] }); // 2. Boosted
    (mockIndex.search as jest.Mock).mockResolvedValueOnce({ hits: [] }); // 3. Primary Query
    (mockIndex.search as jest.Mock).mockResolvedValueOnce({ hits: [] }); // 4. Alt Query
    (mockIndex.search as jest.Mock).mockResolvedValueOnce({
      hits: Array(3).fill({ objectID: 'f1', title: 'Fallback Course' }),
    }); // 5. Scope-only Fallback

    const { courses } = await courseRetrievalService.fetchCourses(mockIndex, translation);

    expect(mockIndex.search).toHaveBeenCalledTimes(5);
    expect(mockIndex.search).toHaveBeenLastCalledWith('', expect.objectContaining({
      hitsPerPage: 5,
    }));
    expect(courses).toHaveLength(3);
    expect(courses[0].title).toBe('Fallback Course');
  });
});
