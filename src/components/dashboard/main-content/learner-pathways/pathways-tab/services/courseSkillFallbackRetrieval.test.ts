import type { SearchIndex } from 'algoliasearch/lite';
import { searchCoursesBySkillFallback } from './courseSkillFallbackRetrieval';
import type { LearnerSkillFallback } from './directCourseKeyRetrieval';
import type { CourseRetrievalCatalogScope } from '../types';

// Reflects courseCatalogScopeFilters.ts's current, real behavior (its
// enterprise_catalog_query_uuids clause is presently commented out there — this test
// mirrors actual production output, not a hoped-for one).
const BASE_SCOPE_FILTERS = 'content_type:course AND metadata_language:en AND language:English';

const catalogScope: CourseRetrievalCatalogScope = {
  searchCatalogs: ['cat-1'],
  catalogUuidsToCatalogQueryUuids: { 'cat-1': 'query-1' },
};

const facetResponse = (skillNames: string[] = ['Python', 'SQL', 'Data Visualization']) => ({
  facets: {
    skill_names: Object.fromEntries(skillNames.map((s) => [s, 1])),
  },
});

const searchResponse = (hits: Record<string, unknown>[]) => ({ hits });

const course = (key: string, extra: Record<string, unknown> = {}) => ({
  key, title: `Course ${key}`, ...extra,
});

const buildIndex = (responses: unknown[]): SearchIndex => {
  const search = jest.fn();
  responses.forEach((response) => search.mockResolvedValueOnce(response));
  return { search } as unknown as SearchIndex;
};

const buildFallback = (overrides: Partial<LearnerSkillFallback> = {}): LearnerSkillFallback => ({
  skillsRequired: ['Python'],
  skillsPreferred: ['SQL'],
  condensedAlgoliaQuery: 'python data analysis',
  roles: [],
  industries: [],
  jobSources: [],
  learnerLevel: 'introductory',
  timeCommitment: 'medium',
  excludeTags: [],
  ...overrides,
});

describe('searchCoursesBySkillFallback', () => {
  it('issues the facet snapshot search, then a single course search with the capped query, base scope filters, and boost optionalFilters', async () => {
    const index = buildIndex([
      facetResponse(),
      searchResponse([course('c1'), course('c2')]),
    ]);

    const result = await searchCoursesBySkillFallback({ index, fallback: buildFallback(), catalogScope });

    expect(result.map((c) => c.courseKey)).toEqual(['c1', 'c2']);
    expect(index.search).toHaveBeenCalledTimes(2);

    const [, courseSearchArgs] = (index.search as jest.Mock).mock.calls;
    expect(courseSearchArgs[0]).toBe('python data analysis');
    expect(courseSearchArgs[1]).toEqual({
      hitsPerPage: 10,
      filters: BASE_SCOPE_FILTERS,
      optionalFilters: ['skill_names:"Python"', 'skill_names:"SQL"'],
    });
  });

  it('caps the query text to its first 3 whitespace-separated terms', async () => {
    const index = buildIndex([facetResponse(), searchResponse([])]);
    const fallback = buildFallback({ condensedAlgoliaQuery: 'python data analysis fundamentals extra' });

    await searchCoursesBySkillFallback({ index, fallback, catalogScope });

    const [, courseSearchArgs] = (index.search as jest.Mock).mock.calls;
    expect(courseSearchArgs[0]).toBe('python data analysis');
  });

  it('grounds required-before-preferred and caps combined boost skills at 8', async () => {
    const catalogSkills = Array.from({ length: 10 }, (_, i) => `Skill${i}`);
    const index = buildIndex([facetResponse(catalogSkills), searchResponse([])]);
    const fallback = buildFallback({
      skillsRequired: ['Skill0', 'Skill1', 'Skill2'],
      skillsPreferred: ['Skill3', 'Skill4', 'Skill5', 'Skill6', 'Skill7', 'Skill8', 'Skill9'],
    });

    await searchCoursesBySkillFallback({ index, fallback, catalogScope });

    const [, courseSearchArgs] = (index.search as jest.Mock).mock.calls;
    expect(courseSearchArgs[1].optionalFilters).toEqual([
      'skill_names:"Skill0"', 'skill_names:"Skill1"', 'skill_names:"Skill2"',
      'skill_names:"Skill3"', 'skill_names:"Skill4"', 'skill_names:"Skill5"',
      'skill_names:"Skill6"', 'skill_names:"Skill7"',
    ]);
  });

  it('drops a skill name that does not exist in the catalog facet vocabulary', async () => {
    const index = buildIndex([facetResponse(['Python']), searchResponse([])]);
    const fallback = buildFallback({ skillsRequired: ['Python'], skillsPreferred: ['Nonexistent Skill'] });

    await searchCoursesBySkillFallback({ index, fallback, catalogScope });

    const [, courseSearchArgs] = (index.search as jest.Mock).mock.calls;
    expect(courseSearchArgs[1].optionalFilters).toEqual(['skill_names:"Python"']);
  });

  it('omits optionalFilters entirely when both skill arrays are empty (degenerate fallback)', async () => {
    const index = buildIndex([facetResponse([]), searchResponse([course('c1')])]);
    const fallback = buildFallback({ skillsRequired: [], skillsPreferred: [] });

    const result = await searchCoursesBySkillFallback({ index, fallback, catalogScope });

    const [, courseSearchArgs] = (index.search as jest.Mock).mock.calls;
    expect(courseSearchArgs[1]).toEqual({ hitsPerPage: 10, filters: BASE_SCOPE_FILTERS });
    expect(result.map((c) => c.courseKey)).toEqual(['c1']);
  });

  it('passes learnerLevel through to reranking unchanged', async () => {
    const index = buildIndex([
      facetResponse(['Python']),
      searchResponse([
        course('c1', { level_type: 'Advanced', skill_names: ['Python'] }),
        course('c2', { level_type: 'Introductory', skill_names: ['Python'] }),
      ]),
    ]);
    const fallback = buildFallback({ learnerLevel: 'introductory' });

    const result = await searchCoursesBySkillFallback({ index, fallback, catalogScope });

    // Both hits have equal skill overlap; the introductory-level hit should rank first
    // due to the level-compatibility bonus for a learnerLevel of "introductory".
    expect(result[0].courseKey).toBe('c2');
  });

  it('deduplicates and caps hits at 5 via the shared rerank helper', async () => {
    const hits = Array.from({ length: 8 }, (_, i) => course(`c${i}`));
    const index = buildIndex([facetResponse(), searchResponse(hits)]);

    const result = await searchCoursesBySkillFallback({ index, fallback: buildFallback(), catalogScope });

    expect(result).toHaveLength(5);
  });

  it('returns an empty array, without throwing, when the search yields zero hits', async () => {
    const index = buildIndex([facetResponse(), searchResponse([])]);

    const result = await searchCoursesBySkillFallback({ index, fallback: buildFallback(), catalogScope });

    expect(result).toEqual([]);
  });
});
