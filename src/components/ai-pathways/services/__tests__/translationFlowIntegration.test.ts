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

  const mockContext = {
    enterpriseCustomerUuid: 'ent-123',
    locale: 'en',
    searchCatalogs: ['cat-abc'],
    catalogUuidsToCatalogQueryUuids: { 'cat-abc': 'query-abc' },
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
    // 1. Setup Taxonomy Input
    const input = { ...baseInput, skills: ['Data Analysis'] };

    // 2. Rules-first translation
    const rulesResult = catalogTranslationRules.translateTaxonomyToCatalog(input);
    expect(rulesResult.exactMatches).toContain('Data Analysis');

    // 3. Service translation (no Xpert yet)
    const translation = catalogTranslationService.processTranslation(
      input.careerTitle,
      mockFacetSnapshot,
      rulesResult,
    );
    expect(translation.strictSkills).toContain('Data Analysis');

    // 4. Mock Algolia hit for level 1
    (mockIndex.search as jest.Mock).mockResolvedValueOnce({
      hits: Array(3).fill({ objectID: 'c1', title: 'Data Analysis Course' }),
    });

    // 5. Course Retrieval
    const courses = await courseRetrievalService.fetchCourses(mockIndex, translation, mockContext);

    // Verify
    expect(mockIndex.search).toHaveBeenCalledTimes(1);
    expect(mockIndex.search).toHaveBeenCalledWith('Data Analyst', expect.objectContaining({
      facetFilters: [['skill_names:Data Analysis']],
    }));
    expect(courses).toHaveLength(3);
  });

  it('alias mapping path: maps "Python" to "Python (Programming Language)" and hits level 1', async () => {
    // 1. Setup Taxonomy Input
    const input = { ...baseInput, skills: ['Python'] };

    // 2. Rules-first translation
    const rulesResult = catalogTranslationRules.translateTaxonomyToCatalog(input);
    expect(rulesResult.aliasMatches).toContain('Python (Programming Language)');

    // 3. Service translation
    const translation = catalogTranslationService.processTranslation(
      input.careerTitle,
      mockFacetSnapshot,
      rulesResult,
    );
    expect(translation.strictSkills).toContain('Python (Programming Language)');

    // 4. Mock Algolia hit for level 1
    (mockIndex.search as jest.Mock).mockResolvedValueOnce({
      hits: Array(3).fill({ objectID: 'c1', title: 'Python Course' }),
    });

    // 5. Course Retrieval
    const courses = await courseRetrievalService.fetchCourses(mockIndex, translation, mockContext);

    // Verify
    expect(mockIndex.search).toHaveBeenCalledTimes(1);
    expect(mockIndex.search).toHaveBeenCalledWith('Data Analyst', expect.objectContaining({
      facetFilters: [['skill_names:Python (Programming Language)']],
    }));
    expect(courses).toHaveLength(3);
  });

  it('invalid Xpert output fallback path: falls back to rules-first when Xpert fails and hits level 1', async () => {
    const input = { ...baseInput, skills: ['Data Analysis'] };
    const rulesResult = catalogTranslationRules.translateTaxonomyToCatalog(input);

    // Xpert returns garbage
    const invalidXpertResponse = 'Invalid JSON or Error string';

    const translation = catalogTranslationService.processTranslation(
      input.careerTitle,
      mockFacetSnapshot,
      rulesResult,
      invalidXpertResponse,
    );

    // Should fall back to rules results
    expect(translation.strictSkills).toContain('Data Analysis');
    expect(translation.query).toBe('Data Analyst');

    // Mock Algolia hit
    (mockIndex.search as jest.Mock).mockResolvedValueOnce({
      hits: Array(3).fill({ objectID: 'c1', title: 'Data Analysis Course' }),
    });

    const courses = await courseRetrievalService.fetchCourses(mockIndex, translation, mockContext);
    expect(courses).toHaveLength(3);
    expect(mockIndex.search).toHaveBeenCalledWith('Data Analyst', expect.objectContaining({
      facetFilters: [['skill_names:Data Analysis']],
    }));
  });

  it('zero-hit strict filter fallback path: level 1 fails, falls back to level 2 (boosted)', async () => {
    const input = { ...baseInput, skills: ['Data Analysis'] };
    const rulesResult = catalogTranslationRules.translateTaxonomyToCatalog(input);

    // Provide an Xpert response that suggests a boost skill to test level 2
    const xpertResponse = JSON.stringify({
      boostSkills: ['SQL (Programming Language)'],
    });

    const translation = catalogTranslationService.processTranslation(
      input.careerTitle,
      mockFacetSnapshot,
      rulesResult,
      xpertResponse,
    );

    expect(translation.boostSkills).toContain('SQL (Programming Language)');

    // 1. Mock Level 1 (Strict) returns 0
    (mockIndex.search as jest.Mock).mockResolvedValueOnce({ hits: [] });
    // 2. Mock Level 2 (Boosted) returns 3
    (mockIndex.search as jest.Mock).mockResolvedValueOnce({
      hits: Array(3).fill({ objectID: 'c2', title: 'Boosted Course' }),
    });

    const courses = await courseRetrievalService.fetchCourses(mockIndex, translation, mockContext);

    expect(mockIndex.search).toHaveBeenCalledTimes(2);
    // Last call should have optionalFilters instead of facetFilters
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

    // Ladder failure sequence:
    // 1. Strict (Rare Skill) -> 0
    (mockIndex.search as jest.Mock).mockResolvedValueOnce({ hits: [] });
    // 2. Boosted (Rare Skill) -> 0
    (mockIndex.search as jest.Mock).mockResolvedValueOnce({ hits: [] });
    // 3. Primary Query (Rare Job Title) -> 0
    (mockIndex.search as jest.Mock).mockResolvedValueOnce({ hits: [] });
    // 4. Alt Query (Alt 1) -> 0
    (mockIndex.search as jest.Mock).mockResolvedValueOnce({ hits: [] });
    // 5. Scope-only Fallback -> 3
    (mockIndex.search as jest.Mock).mockResolvedValueOnce({
      hits: Array(3).fill({ objectID: 'f1', title: 'Fallback Course' }),
    });

    const courses = await courseRetrievalService.fetchCourses(mockIndex, translation, mockContext);

    expect(mockIndex.search).toHaveBeenCalledTimes(5);
    // Final call should have empty query and base params
    expect(mockIndex.search).toHaveBeenLastCalledWith('', expect.objectContaining({
      hitsPerPage: 5,
    }));
    const lastCallParams = (mockIndex.search as jest.Mock).mock.calls[4][1];
    expect(lastCallParams.facetFilters).toBeUndefined();
    expect(lastCallParams.optionalFilters).toBeUndefined();

    expect(courses).toHaveLength(3);
    expect(courses[0].title).toBe('Fallback Course');
  });
});
