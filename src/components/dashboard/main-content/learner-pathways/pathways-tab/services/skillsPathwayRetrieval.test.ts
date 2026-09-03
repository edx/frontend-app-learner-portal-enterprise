import type { SearchIndex } from 'algoliasearch/lite';
import { searchCoursesForSkillsPathway } from './skillsPathwayRetrieval';
import type { LearningIntentResponse } from '../../../../../app/data/services/xpert';
import type { CourseRetrievalCatalogScope } from '../types';

// Reflects courseCatalogScopeFilters.ts's current, real behavior — the
// enterprise_catalog_query_uuids clause is applied (fixed as part of this change).
const BASE_SCOPE_FILTERS = 'content_type:course AND (enterprise_catalog_query_uuids:query-1) AND metadata_language:en AND language:English';

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

const buildLearningIntent = (
  overrides: Partial<LearningIntentResponse> = {},
): LearningIntentResponse => ({
  skillsRequired: ['Python'],
  skillsPreferred: ['SQL'],
  condensedAlgoliaQuery: 'python data analysis',
  ...overrides,
});

describe('searchCoursesForSkillsPathway', () => {
  it('issues the facet snapshot search, then a single course search with the capped query, base scope filters, and boost optionalFilters', async () => {
    const index = buildIndex([
      facetResponse(),
      searchResponse([course('c1'), course('c2')]),
    ]);

    const result = await searchCoursesForSkillsPathway({ index, learningIntent: buildLearningIntent(), catalogScope });

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
    const learningIntent = buildLearningIntent({ condensedAlgoliaQuery: 'python data analysis fundamentals extra' });

    await searchCoursesForSkillsPathway({ index, learningIntent, catalogScope });

    const [, courseSearchArgs] = (index.search as jest.Mock).mock.calls;
    expect(courseSearchArgs[0]).toBe('python data analysis');
  });

  it('grounds required-before-preferred and caps combined boost skills at 8', async () => {
    const catalogSkills = Array.from({ length: 10 }, (_, i) => `Skill${i}`);
    const index = buildIndex([facetResponse(catalogSkills), searchResponse([])]);
    const learningIntent = buildLearningIntent({
      skillsRequired: ['Skill0', 'Skill1', 'Skill2'],
      skillsPreferred: ['Skill3', 'Skill4', 'Skill5', 'Skill6', 'Skill7', 'Skill8', 'Skill9'],
    });

    await searchCoursesForSkillsPathway({ index, learningIntent, catalogScope });

    const [, courseSearchArgs] = (index.search as jest.Mock).mock.calls;
    expect(courseSearchArgs[1].optionalFilters).toEqual([
      'skill_names:"Skill0"', 'skill_names:"Skill1"', 'skill_names:"Skill2"',
      'skill_names:"Skill3"', 'skill_names:"Skill4"', 'skill_names:"Skill5"',
      'skill_names:"Skill6"', 'skill_names:"Skill7"',
    ]);
  });

  it('drops a skill name that does not exist in the catalog facet vocabulary', async () => {
    const index = buildIndex([facetResponse(['Python']), searchResponse([])]);
    const learningIntent = buildLearningIntent({ skillsRequired: ['Python'], skillsPreferred: ['Nonexistent Skill'] });

    await searchCoursesForSkillsPathway({ index, learningIntent, catalogScope });

    const [, courseSearchArgs] = (index.search as jest.Mock).mock.calls;
    expect(courseSearchArgs[1].optionalFilters).toEqual(['skill_names:"Python"']);
  });

  it('omits optionalFilters entirely when both skill arrays are empty (degenerate learning intent)', async () => {
    const index = buildIndex([facetResponse([]), searchResponse([course('c1')])]);
    const learningIntent = buildLearningIntent({ skillsRequired: [], skillsPreferred: [] });

    const result = await searchCoursesForSkillsPathway({ index, learningIntent, catalogScope });

    const [, courseSearchArgs] = (index.search as jest.Mock).mock.calls;
    expect(courseSearchArgs[1]).toEqual({ hitsPerPage: 10, filters: BASE_SCOPE_FILTERS });
    expect(result.map((c) => c.courseKey)).toEqual(['c1']);
  });

  it('never scores a level-compatibility bonus, since Learning Intent carries no learner-level signal', async () => {
    const index = buildIndex([
      facetResponse(['Python']),
      searchResponse([
        course('c1', { level_type: 'Advanced', skill_names: ['Python'] }),
        course('c2', { level_type: 'Introductory', skill_names: ['Python'] }),
      ]),
    ]);

    const result = await searchCoursesForSkillsPathway({ index, learningIntent: buildLearningIntent(), catalogScope });

    // Equal skill overlap and no level signal at all — original Algolia order wins the tie.
    expect(result.map((c) => c.courseKey)).toEqual(['c1', 'c2']);
  });

  it('deduplicates and caps hits at 5 via the shared rerank helper', async () => {
    const hits = Array.from({ length: 8 }, (_, i) => course(`c${i}`));
    const index = buildIndex([facetResponse(), searchResponse(hits)]);

    const result = await searchCoursesForSkillsPathway({ index, learningIntent: buildLearningIntent(), catalogScope });

    expect(result).toHaveLength(5);
  });

  it('returns an empty array, without throwing, when the search yields zero hits', async () => {
    const index = buildIndex([facetResponse(), searchResponse([])]);

    const result = await searchCoursesForSkillsPathway({ index, learningIntent: buildLearningIntent(), catalogScope });

    expect(result).toEqual([]);
  });
});
