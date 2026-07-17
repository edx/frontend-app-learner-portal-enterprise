import type { SearchIndex } from 'algoliasearch/lite';
import { courseRetrievalService } from './courseRetrieval';
import type { CourseSearchOptions } from '../types';

const catalogScope = {
  searchCatalogs: ['cat1'],
  catalogUuidsToCatalogQueryUuids: { cat1: 'q1' },
};

const BASE_SCOPE_FILTERS = 'content_type:course AND (enterprise_catalog_query_uuids:q1)';

const facetResponse = (skillNames: string[] = ['SQL', 'Excel']) => ({
  facets: {
    skill_names: Object.fromEntries(skillNames.map((s) => [s, 1])),
  },
});

const searchResponse = (hits: Record<string, unknown>[]) => ({ hits });

const buildOptions = (overrides: Partial<CourseSearchOptions> = {}): CourseSearchOptions => ({
  selectedCareer: { title: 'Data Analyst', skillsToDevelop: ['Excel'] },
  intent: {
    condensedAlgoliaQuery: 'data analysis',
    skillsRequired: ['SQL'],
    skillsPreferred: [],
  },
  catalogScope,
  ...overrides,
});

const buildIndex = (responses: unknown[]): SearchIndex => {
  const search = jest.fn();
  responses.forEach((response) => search.mockResolvedValueOnce(response));
  return { search } as unknown as SearchIndex;
};

const course = (key: string, extra: Record<string, unknown> = {}) => ({
  key, title: `Course ${key}`, ...extra,
});

describe('courseRetrievalService.searchCourses', () => {
  describe('Step 1 — Hybrid Broad', () => {
    it('wins and short-circuits when it reaches the minimum valid course threshold', async () => {
      const index = buildIndex([
        facetResponse(),
        searchResponse([course('c1'), course('c2'), course('c3')]),
      ]);

      const result = await courseRetrievalService.searchCourses(index, buildOptions());

      expect(result.map((c) => c.courseKey)).toEqual(['c1', 'c2', 'c3']);
      expect(index.search).toHaveBeenCalledTimes(2);

      const [, step1Args] = (index.search as jest.Mock).mock.calls;
      expect(step1Args[0]).toBe('sql');
      expect(step1Args[1]).toEqual({
        hitsPerPage: 10,
        filters: `${BASE_SCOPE_FILTERS} AND (skill_names:"SQL")`,
        optionalFilters: ['skill_names:"Excel"'],
      });
    });

    it('is skipped entirely (no request) when neither strict nor boost skills ground to anything', async () => {
      const index = buildIndex([
        facetResponse([]),
        searchResponse([course('c1'), course('c2'), course('c3')]),
      ]);
      const options = buildOptions({
        selectedCareer: { title: 'Data Analyst', skillsToDevelop: [] },
        intent: { condensedAlgoliaQuery: 'q', skillsRequired: [], skillsPreferred: [] },
      });

      const result = await courseRetrievalService.searchCourses(index, options);

      expect(result.map((c) => c.courseKey)).toEqual(['c1', 'c2', 'c3']);
      expect(index.search).toHaveBeenCalledTimes(2);

      const [, step2Args] = (index.search as jest.Mock).mock.calls;
      expect(step2Args[0]).toBe('Data Analyst');
      expect(step2Args[1]).toEqual({ hitsPerPage: 10, filters: BASE_SCOPE_FILTERS });
    });
  });

  describe('Step 2 — Boosted Text', () => {
    it('wins with boost-only params and no strict clause when Step 1 is insufficient', async () => {
      const index = buildIndex([
        facetResponse(),
        searchResponse([course('c1')]),
        searchResponse([course('c2'), course('c3'), course('c4')]),
      ]);

      const result = await courseRetrievalService.searchCourses(index, buildOptions());

      expect(result.map((c) => c.courseKey)).toEqual(['c2', 'c3', 'c4']);
      expect(index.search).toHaveBeenCalledTimes(3);

      const [, , step2Args] = (index.search as jest.Mock).mock.calls;
      expect(step2Args[0]).toBe('sql');
      expect(step2Args[1]).toEqual({
        hitsPerPage: 10,
        filters: BASE_SCOPE_FILTERS,
        optionalFilters: ['skill_names:"Excel"'],
      });
    });
  });

  describe('Step 3 — Career Text', () => {
    it('iterates query then alternates sequentially, stopping at the first winner', async () => {
      const index = buildIndex([
        facetResponse(),
        searchResponse([course('c1')]),
        searchResponse([course('c2')]),
        searchResponse([course('c3')]),
        searchResponse([course('c4'), course('c5'), course('c6')]),
      ]);

      const result = await courseRetrievalService.searchCourses(index, buildOptions());

      expect(result.map((c) => c.courseKey)).toEqual(['c4', 'c5', 'c6']);
      expect(index.search).toHaveBeenCalledTimes(5);

      const { calls } = (index.search as jest.Mock).mock;
      expect(calls[3][0]).toBe('sql');
      expect(calls[3][1]).toEqual({ hitsPerPage: 10, filters: BASE_SCOPE_FILTERS });
      expect(calls[4][0]).toBe('Data Analyst');
      expect(calls[4][1]).toEqual({ hitsPerPage: 10, filters: BASE_SCOPE_FILTERS });
    });

    it('returns [] when the ladder is exhausted, issuing no further request beyond query + alternates', async () => {
      const index = buildIndex([
        facetResponse(),
        searchResponse([course('c1')]),
        searchResponse([course('c2')]),
        searchResponse([course('c3')]),
        searchResponse([course('c4')]),
      ]);

      const result = await courseRetrievalService.searchCourses(index, buildOptions());

      expect(result).toEqual([]);
      expect(index.search).toHaveBeenCalledTimes(5);
    });
  });

  describe('validity vs raw hit count', () => {
    it('does not let a step win on raw hit count alone when too few hits map to valid courses', async () => {
      const index = buildIndex([
        facetResponse(),
        searchResponse([
          course('c1'),
          { key: '', title: 'No key' },
          { key: 'c2' },
          course('c2'),
          { title: 'No key at all' },
        ]),
        searchResponse([course('c3'), course('c4'), course('c5')]),
      ]);

      const result = await courseRetrievalService.searchCourses(index, buildOptions());

      expect(result.map((c) => c.courseKey)).toEqual(['c3', 'c4', 'c5']);
      expect(index.search).toHaveBeenCalledTimes(3);
    });
  });

  describe('mapping and boundary safety', () => {
    it('never falls back to objectID for courseKey — a hit with only objectID is dropped', async () => {
      const index = buildIndex([
        facetResponse(),
        searchResponse([
          course('c1'), course('c2'), course('c3'),
          { objectID: 'abc-no-key', title: 'Ghost course' },
        ]),
      ]);

      const result = await courseRetrievalService.searchCourses(index, buildOptions());

      expect(result.map((c) => c.courseKey)).toEqual(['c1', 'c2', 'c3']);
    });

    it('maps provider from partners[0].name and level from level_type, always omitting length', async () => {
      const index = buildIndex([
        facetResponse(),
        searchResponse([
          course('c1', { partners: [{ name: 'MIT' }], level_type: 'Introductory' }),
          course('c2'),
          course('c3'),
        ]),
      ]);

      const result = await courseRetrievalService.searchCourses(index, buildOptions());

      expect(result[0]).toEqual({
        courseKey: 'c1', title: 'Course c1', provider: 'MIT', level: 'Introductory', status: 'not_started',
      });
      expect(result[0]).not.toHaveProperty('length');
      expect(result[0]).not.toHaveProperty('whyThisFitsYou');
    });

    it('omits provider/level when partners/level_type are absent, rather than fabricating values', async () => {
      const index = buildIndex([
        facetResponse(),
        searchResponse([course('c1'), course('c2'), course('c3')]),
      ]);

      const result = await courseRetrievalService.searchCourses(index, buildOptions());

      expect(result[0]).not.toHaveProperty('provider');
      expect(result[0]).not.toHaveProperty('level');
    });

    it('dedupes by courseKey, first occurrence winning', async () => {
      const index = buildIndex([
        facetResponse(),
        searchResponse([
          course('c1', { level_type: 'Introductory' }),
          course('c1', { level_type: 'Advanced' }),
          course('c2'),
          course('c3'),
        ]),
      ]);

      const result = await courseRetrievalService.searchCourses(index, buildOptions());

      expect(result.map((c) => c.courseKey)).toEqual(['c1', 'c2', 'c3']);
      expect(result[0].level).toBe('Introductory');
    });
  });

  describe('rerank', () => {
    it('orders winning-step hits by strict overlap (10) then boost overlap (3) then level bonus, tiebreaking on original order', async () => {
      const index = buildIndex([
        facetResponse(),
        searchResponse([
          course('low', { skill_names: [] }),
          course('strict', { skill_names: ['SQL'] }),
          course('boost', { skill_names: ['Excel'] }),
          course('both', { skill_names: ['SQL', 'Excel'] }),
        ]),
      ]);

      const result = await courseRetrievalService.searchCourses(index, buildOptions());

      expect(result.map((c) => c.courseKey)).toEqual(['both', 'strict', 'boost', 'low']);
    });

    it('caps reranked results at 5', async () => {
      const index = buildIndex([
        facetResponse(),
        searchResponse([
          course('c1'), course('c2'), course('c3'), course('c4'), course('c5'), course('c6'),
        ]),
      ]);

      const result = await courseRetrievalService.searchCourses(index, buildOptions());

      expect(result).toHaveLength(5);
    });

    it('applies a learner-level bonus: exact match +2, adjacent +1, mismatch +0', async () => {
      const index = buildIndex([
        facetResponse([]),
        searchResponse([
          course('mismatch', { level_type: 'Advanced' }),
          course('adjacent', { level_type: 'Intermediate' }),
          course('exact', { level_type: 'Introductory' }),
        ]),
      ]);
      const options = buildOptions({
        selectedCareer: { title: 'Data Analyst', skillsToDevelop: [] },
        intent: {
          condensedAlgoliaQuery: 'q', skillsRequired: [], skillsPreferred: [], learnerLevel: 'introductory',
        },
      });

      const result = await courseRetrievalService.searchCourses(index, options);

      expect(result.map((c) => c.courseKey)).toEqual(['exact', 'adjacent', 'mismatch']);
    });
  });

  describe('error propagation', () => {
    it('propagates a rejected index.search call uncaught', async () => {
      const searchError = new Error('Algolia service unavailable');
      const index: SearchIndex = { search: jest.fn().mockRejectedValue(searchError) } as unknown as SearchIndex;

      await expect(courseRetrievalService.searchCourses(index, buildOptions())).rejects.toThrow(searchError);
    });
  });
});
