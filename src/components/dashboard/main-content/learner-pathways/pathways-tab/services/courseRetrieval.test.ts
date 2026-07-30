import type { SearchIndex } from 'algoliasearch/lite';
import { courseRetrievalService } from './courseRetrieval';
import * as catalogSkillTranslation from './catalogSkillTranslation';
import type { CourseSearchOptions } from '../types';

const BASE_SCOPE_FACET_FILTERS = ['content_type:course'];

const facetResponse = (skillNames: string[] = ['SQL', 'Excel']) => ({
  facets: {
    skill_names: Object.fromEntries(skillNames.map((s) => [s, 1])),
  },
});

const searchResponse = (hits: Record<string, unknown>[]) => ({ hits });

const buildOptions = (overrides: Partial<CourseSearchOptions> = {}): CourseSearchOptions => ({
  selectedCareer: { title: 'Data Analyst', skillsToDevelop: ['Excel'] },
  intent: {
    skillsRequired: ['SQL'],
    skillsPreferred: [],
  },
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
        facetFilters: [...BASE_SCOPE_FACET_FILTERS, ['skill_names:SQL']],
        optionalFilters: ['skill_names:Excel'],
      });
    });

    it('does not quote or escape a multi-word/special-character strict skill name in the facetFilters group', async () => {
      const index = buildIndex([
        facetResponse(['Data "Wrangling"']),
        searchResponse([course('c1'), course('c2'), course('c3')]),
      ]);
      const options = buildOptions({
        intent: { skillsRequired: ['Data "Wrangling"'], skillsPreferred: [] },
        selectedCareer: { title: 'Data Analyst', skillsToDevelop: [] },
      });

      await courseRetrievalService.searchCourses(index, options);

      const [, step1Args] = (index.search as jest.Mock).mock.calls;
      expect(step1Args[1]).toEqual(expect.objectContaining({
        facetFilters: [...BASE_SCOPE_FACET_FILTERS, ['skill_names:Data "Wrangling"']],
      }));
    });

    it('still runs using the career-title query and base scope alone when no skills ground to anything', async () => {
      // No strict/boost signals ground at all, but `translation.query` falls back to the
      // (non-empty) career title — so Step 1 legitimately runs on the query alone, with
      // no strict facet group and no optionalFilters.
      const index = buildIndex([
        facetResponse([]),
        searchResponse([course('c1'), course('c2'), course('c3')]),
      ]);
      const options = buildOptions({
        selectedCareer: { title: 'Data Analyst', skillsToDevelop: [] },
        intent: { skillsRequired: [], skillsPreferred: [] },
      });

      const result = await courseRetrievalService.searchCourses(index, options);

      expect(result.map((c) => c.courseKey)).toEqual(['c1', 'c2', 'c3']);
      expect(index.search).toHaveBeenCalledTimes(2);

      const [, step1Args] = (index.search as jest.Mock).mock.calls;
      expect(step1Args[0]).toBe('Data Analyst');
      expect(step1Args[1]).toEqual({ hitsPerPage: 10, facetFilters: BASE_SCOPE_FACET_FILTERS });
    });

    it('skips Step 1 entirely when the query is empty and only boost (optional) skills exist, advancing to Step 2', async () => {
      // The real classification pipeline's fallback-promotion always moves at least one
      // boost skill to strict whenever zero strict skills survive grounding, so this exact
      // "boost-only, no strict, empty query" state can't be produced through a realistic
      // CourseSearchOptions/facet-snapshot combination — it's stubbed directly here to
      // exercise the guard itself, per the required regression coverage for this case.
      const translateSpy = jest.spyOn(catalogSkillTranslation, 'translateSkillsToCatalog').mockReturnValue({
        query: '',
        queryAlternates: ['Data Analyst'],
        strictSkillFilters: [],
        boostSkillFilters: [{ catalogSkill: 'Excel', catalogField: 'skill_names' }],
      });

      const index = buildIndex([
        facetResponse(),
        searchResponse([course('c1'), course('c2'), course('c3')]),
      ]);

      const result = await courseRetrievalService.searchCourses(index, buildOptions());

      expect(result.map((c) => c.courseKey)).toEqual(['c1', 'c2', 'c3']);
      expect(index.search).toHaveBeenCalledTimes(2);

      const [, step2Args] = (index.search as jest.Mock).mock.calls;
      expect(step2Args[0]).toBe('');
      expect(step2Args[1]).toEqual({
        hitsPerPage: 10,
        facetFilters: BASE_SCOPE_FACET_FILTERS,
        optionalFilters: ['skill_names:Excel'],
      });

      translateSpy.mockRestore();
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
        facetFilters: BASE_SCOPE_FACET_FILTERS,
        optionalFilters: ['skill_names:Excel'],
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
      expect(calls[3][1]).toEqual({ hitsPerPage: 10, facetFilters: BASE_SCOPE_FACET_FILTERS });
      expect(calls[4][0]).toBe('Data Analyst');
      expect(calls[4][1]).toEqual({ hitsPerPage: 10, facetFilters: BASE_SCOPE_FACET_FILTERS });
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
          skillsRequired: [], skillsPreferred: [], learnerLevel: 'introductory',
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
