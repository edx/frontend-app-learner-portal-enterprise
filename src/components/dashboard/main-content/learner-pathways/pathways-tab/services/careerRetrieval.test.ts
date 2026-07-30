import type { SearchIndex } from 'algoliasearch/lite';
import { careerRetrievalService } from './careerRetrieval';
import * as careerSkillTranslation from './careerSkillTranslation';
import type { CareerSearchIntent } from '../types';

const DEFAULT_INTENT: CareerSearchIntent = {
  condensedAlgoliaQuery: '',
  roles: [],
  skillsRequired: [],
  skillsPreferred: [],
  industries: [],
  jobSources: [],
  learnerLevel: 'intermediate',
  timeCommitment: 'medium',
  excludeTags: [],
};

const SOME_CAREER_HIT = { id: '1', name: 'Some Career' };

describe('careerRetrievalService.searchCareers', () => {
  const mockIndex = {
    search: jest.fn(),
  } as unknown as SearchIndex;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  /** Queues the facet-snapshot response `searchCareers` always fetches first. */
  const mockFacetSnapshot = (skillNames: string[] = []) => {
    (mockIndex.search as jest.Mock).mockResolvedValueOnce({
      facets: { 'skills.name': Object.fromEntries(skillNames.map((s) => [s, 1])) },
    });
  };

  const mockSearchResolvedValue = (hits: unknown[]) => {
    (mockIndex.search as jest.Mock).mockResolvedValueOnce({ hits });
  };

  describe('query construction', () => {
    it('uses the trimmed condensedAlgoliaQuery and calls the ladder exactly once after the facet snapshot fetch', async () => {
      mockFacetSnapshot();
      mockSearchResolvedValue([]);

      await careerRetrievalService.searchCareers(mockIndex, {
        ...DEFAULT_INTENT,
        condensedAlgoliaQuery: '  Software Engineer  ',
      });

      expect(mockIndex.search).toHaveBeenCalledTimes(2);
      const [, ladderArgs] = (mockIndex.search as jest.Mock).mock.calls;
      expect(ladderArgs[0]).toBe('Software Engineer');
      expect(ladderArgs[1]).toEqual(expect.objectContaining({ hitsPerPage: 10 }));
    });

    it('falls back to the first normalized role when condensedAlgoliaQuery is blank', async () => {
      // Includes a non-empty skillsRequired, so the ladder would try further steps if
      // step 1 comes back empty — seed a valid hit so step 1 wins and the params
      // assertion below reflects step 1's request, not a later step's.
      mockFacetSnapshot();
      mockSearchResolvedValue([SOME_CAREER_HIT]);

      await careerRetrievalService.searchCareers(mockIndex, {
        ...DEFAULT_INTENT,
        condensedAlgoliaQuery: '   ',
        roles: ['Developer'],
        skillsRequired: ['JavaScript'],
      });

      const [, ladderArgs] = (mockIndex.search as jest.Mock).mock.calls;
      expect(ladderArgs[0]).toBe('Developer');
    });

    it('falls back to the first normalized required skill when there are no roles', async () => {
      mockFacetSnapshot();
      mockSearchResolvedValue([SOME_CAREER_HIT]);

      await careerRetrievalService.searchCareers(mockIndex, {
        ...DEFAULT_INTENT,
        roles: [],
        skillsRequired: ['JavaScript'],
      });

      const [, ladderArgs] = (mockIndex.search as jest.Mock).mock.calls;
      expect(ladderArgs[0]).toBe('JavaScript');
    });

    it('still makes exactly one ladder request with an empty string query when no term exists', async () => {
      mockFacetSnapshot();
      mockSearchResolvedValue([]);

      await careerRetrievalService.searchCareers(mockIndex, DEFAULT_INTENT);

      expect(mockIndex.search).toHaveBeenCalledTimes(2);
      const [, ladderArgs] = (mockIndex.search as jest.Mock).mock.calls;
      expect(ladderArgs[0]).toBe('');
    });
  });

  describe('hard filters (industries/jobSources/excludeTags facetFilters)', () => {
    it('builds an industry_names nested OR-group from industries', async () => {
      mockFacetSnapshot();
      mockSearchResolvedValue([SOME_CAREER_HIT]);

      await careerRetrievalService.searchCareers(mockIndex, {
        ...DEFAULT_INTENT,
        industries: ['Tech', 'Healthcare'],
      });

      const [, params] = (mockIndex.search as jest.Mock).mock.calls[1];
      expect(params.facetFilters).toEqual([['industry_names:Tech', 'industry_names:Healthcare']]);
    });

    it('builds a job_sources nested OR-group from jobSources', async () => {
      mockFacetSnapshot();
      mockSearchResolvedValue([SOME_CAREER_HIT]);

      await careerRetrievalService.searchCareers(mockIndex, {
        ...DEFAULT_INTENT,
        jobSources: ['LinkedIn'],
      });

      const [, params] = (mockIndex.search as jest.Mock).mock.calls[1];
      expect(params.facetFilters).toEqual([['job_sources:LinkedIn']]);
    });

    it('does not quote or escape a multi-word industry value in the nested OR-group', async () => {
      mockFacetSnapshot();
      mockSearchResolvedValue([SOME_CAREER_HIT]);

      await careerRetrievalService.searchCareers(mockIndex, {
        ...DEFAULT_INTENT,
        industries: ['Health Care'],
      });

      const [, params] = (mockIndex.search as jest.Mock).mock.calls[1];
      expect(params.facetFilters).toEqual([['industry_names:Health Care']]);
    });

    it('builds negated, top-level (independently-AND-ed) skills.name entries from excludeTags, unescaped', async () => {
      mockFacetSnapshot();
      mockSearchResolvedValue([SOME_CAREER_HIT]);

      await careerRetrievalService.searchCareers(mockIndex, {
        ...DEFAULT_INTENT,
        excludeTags: ['PHP', 'tag"2'],
      });

      const [, params] = (mockIndex.search as jest.Mock).mock.calls[1];
      expect(params.facetFilters).toEqual(['-skills.name:PHP', '-skills.name:tag"2']);
    });

    it('escapes an excludeTags value that itself starts with a leading minus', async () => {
      mockFacetSnapshot();
      mockSearchResolvedValue([SOME_CAREER_HIT]);

      await careerRetrievalService.searchCareers(mockIndex, {
        ...DEFAULT_INTENT,
        excludeTags: ['-Ops'],
      });

      const [, params] = (mockIndex.search as jest.Mock).mock.calls[1];
      expect(params.facetFilters).toEqual(['-skills.name:\\-Ops']);
    });

    it('omits facetFilters entirely when no hard filter applies and no skill grounds', async () => {
      mockFacetSnapshot();
      mockSearchResolvedValue([]);

      await careerRetrievalService.searchCareers(mockIndex, DEFAULT_INTENT);

      const [, params] = (mockIndex.search as jest.Mock).mock.calls[1];
      expect(params.facetFilters).toBeUndefined();
    });
  });

  describe('strict/boost skill classification', () => {
    it('grounds required skills as a strict facetFilters group and preferred skills as scored optionalFilters', async () => {
      mockFacetSnapshot(['React', 'AWS']);
      mockSearchResolvedValue([SOME_CAREER_HIT]);

      await careerRetrievalService.searchCareers(mockIndex, {
        ...DEFAULT_INTENT,
        skillsRequired: ['React'],
        skillsPreferred: ['AWS'],
      });

      const [, params] = (mockIndex.search as jest.Mock).mock.calls[1];
      expect(params.facetFilters).toEqual([['skills.name:React']]);
      expect(params.optionalFilters).toEqual(['skills.name:AWS<score=1>']);
    });

    it('deduplicates and ignores blank skill values', async () => {
      mockFacetSnapshot(['React']);
      mockSearchResolvedValue([SOME_CAREER_HIT]);

      await careerRetrievalService.searchCareers(mockIndex, {
        ...DEFAULT_INTENT,
        skillsRequired: ['React', 'React', '  ', ''],
      });

      const [, params] = (mockIndex.search as jest.Mock).mock.calls[1];
      expect(params.facetFilters).toEqual([['skills.name:React']]);
    });

    it('drops malformed compound skill strings before they can ever ground', async () => {
      mockFacetSnapshot(['Cloud Computing']);
      mockSearchResolvedValue([SOME_CAREER_HIT]);

      await careerRetrievalService.searchCareers(mockIndex, {
        ...DEFAULT_INTENT,
        skillsRequired: ['Cloud Computing', 'SQL & Python'],
      });

      const [, params] = (mockIndex.search as jest.Mock).mock.calls[1];
      expect(params.facetFilters).toEqual([['skills.name:Cloud Computing']]);
    });

    it('drops a skill that does not ground against the facet snapshot', async () => {
      mockFacetSnapshot(['React']);
      mockSearchResolvedValue([SOME_CAREER_HIT]);

      await careerRetrievalService.searchCareers(mockIndex, {
        ...DEFAULT_INTENT,
        skillsRequired: ['React', 'NotInTaxonomy'],
      });

      const [, params] = (mockIndex.search as jest.Mock).mock.calls[1];
      expect(params.facetFilters).toEqual([['skills.name:React']]);
    });

    it('caps required (strict) skills at 4 and preferred (boost) skills at 2', async () => {
      const allSkills = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
      mockFacetSnapshot(allSkills);
      mockSearchResolvedValue([SOME_CAREER_HIT]);

      await careerRetrievalService.searchCareers(mockIndex, {
        ...DEFAULT_INTENT,
        skillsRequired: ['A', 'B', 'C', 'D', 'E'],
        skillsPreferred: ['F', 'G', 'H'],
      });

      const [, params] = (mockIndex.search as jest.Mock).mock.calls[1];
      expect(params.facetFilters[0]).toHaveLength(4);
      expect(params.optionalFilters).toHaveLength(2);
    });

    it('suppresses preferred (boost) skills entirely for introductory learners', async () => {
      mockFacetSnapshot(['Cloud Computing', 'AWS', 'Kubernetes']);
      mockSearchResolvedValue([SOME_CAREER_HIT]);

      await careerRetrievalService.searchCareers(mockIndex, {
        ...DEFAULT_INTENT,
        learnerLevel: 'introductory',
        skillsRequired: ['Cloud Computing'],
        skillsPreferred: ['AWS', 'Kubernetes'],
      });

      const [, params] = (mockIndex.search as jest.Mock).mock.calls[1];
      expect(params.facetFilters).toEqual([['skills.name:Cloud Computing']]);
      expect(params.optionalFilters).toBeUndefined();
    });

    it('promotes a boost skill to strict when zero required skills ground to anything', async () => {
      mockFacetSnapshot(['AWS']);
      mockSearchResolvedValue([SOME_CAREER_HIT]);

      await careerRetrievalService.searchCareers(mockIndex, {
        ...DEFAULT_INTENT,
        skillsPreferred: ['AWS'],
      });

      const [, params] = (mockIndex.search as jest.Mock).mock.calls[1];
      expect(params.facetFilters).toEqual([['skills.name:AWS']]);
      expect(params.optionalFilters).toBeUndefined();
    });

    it('never places the same skill in both the strict and boost groups', async () => {
      mockFacetSnapshot(['SQL']);
      mockSearchResolvedValue([SOME_CAREER_HIT]);

      await careerRetrievalService.searchCareers(mockIndex, {
        ...DEFAULT_INTENT,
        skillsRequired: ['SQL'],
        skillsPreferred: ['SQL'],
      });

      const [, params] = (mockIndex.search as jest.Mock).mock.calls[1];
      expect(params.facetFilters).toEqual([['skills.name:SQL']]);
      expect(params.optionalFilters).toBeUndefined();
    });

    it('omits facetFilters and optionalFilters entirely when no usable skill filters exist', async () => {
      mockFacetSnapshot();
      mockSearchResolvedValue([]);

      await careerRetrievalService.searchCareers(mockIndex, DEFAULT_INTENT);

      const [, params] = (mockIndex.search as jest.Mock).mock.calls[1];
      expect(params.facetFilters).toBeUndefined();
      expect(params.optionalFilters).toBeUndefined();
    });

    it('combines the strict skill group alongside independent industry/job-source facets, as separate AND-ed entries', async () => {
      mockFacetSnapshot(['React']);
      mockSearchResolvedValue([SOME_CAREER_HIT]);

      await careerRetrievalService.searchCareers(mockIndex, {
        ...DEFAULT_INTENT,
        industries: ['Tech'],
        skillsRequired: ['React'],
      });

      const [, params] = (mockIndex.search as jest.Mock).mock.calls[1];
      expect(params.facetFilters).toEqual([['industry_names:Tech'], ['skills.name:React']]);
    });
  });

  describe('taxonomy mapping', () => {
    it('maps id, title, and skillsToDevelop, preserving hit order', async () => {
      mockFacetSnapshot();
      mockSearchResolvedValue([
        { id: '1', name: 'Software Engineer', skills: [{ name: 'React' }, { name: 'React' }, { name: 'SQL' }] },
        { id: '2', name: 'Data Analyst', skills: [] },
      ]);

      const careers = await careerRetrievalService.searchCareers(mockIndex, DEFAULT_INTENT);

      expect(careers).toEqual([
        { id: '1', title: 'Software Engineer', skillsToDevelop: ['React', 'SQL'] },
        { id: '2', title: 'Data Analyst' },
      ]);
    });

    it('uses objectID when the domain id is absent', async () => {
      mockFacetSnapshot();
      mockSearchResolvedValue([{ objectID: 'obj-1', name: 'Nurse' }]);

      const careers = await careerRetrievalService.searchCareers(mockIndex, DEFAULT_INTENT);

      expect(careers).toEqual([{ id: 'obj-1', title: 'Nurse' }]);
    });

    it('does not leak raw, ranking, or Algolia response fields onto the mapped result', async () => {
      mockFacetSnapshot();
      mockSearchResolvedValue([{
        id: '1',
        name: 'Software Engineer',
        _rankingInfo: { nbTypos: 0 },
        _highlightResult: {},
      }]);

      const careers = await careerRetrievalService.searchCareers(mockIndex, DEFAULT_INTENT);

      expect(careers).toEqual([{ id: '1', title: 'Software Engineer' }]);
      expect(careers[0]).not.toHaveProperty('raw');
      expect(careers[0]).not.toHaveProperty('_rankingInfo');
      expect(careers[0]).not.toHaveProperty('matchPercentage');
      expect(careers[0]).not.toHaveProperty('laborMarketTrend');
    });
  });

  describe('empty and malformed results', () => {
    it('resolves zero hits to an empty array, with no facets or query to loosen', async () => {
      mockFacetSnapshot();
      mockSearchResolvedValue([]);

      const careers = await careerRetrievalService.searchCareers(mockIndex, DEFAULT_INTENT);

      expect(careers).toEqual([]);
      // DEFAULT_INTENT has no query, facetFilters, or optionalFilters at all, so every
      // ladder step beyond step 1 is correctly guarded off as redundant.
      expect(mockIndex.search).toHaveBeenCalledTimes(2);
    });

    it('skips hits missing both id and objectID', async () => {
      mockFacetSnapshot();
      mockSearchResolvedValue([
        { name: 'No Identifier' },
        { id: '1', name: 'Valid Career' },
      ]);

      const careers = await careerRetrievalService.searchCareers(mockIndex, DEFAULT_INTENT);

      expect(careers).toEqual([{ id: '1', title: 'Valid Career' }]);
    });

    it('skips hits missing a name', async () => {
      mockFacetSnapshot();
      mockSearchResolvedValue([
        { id: '1' },
        { id: '2', name: 'Valid Career' },
      ]);

      const careers = await careerRetrievalService.searchCareers(mockIndex, DEFAULT_INTENT);

      expect(careers).toEqual([{ id: '2', title: 'Valid Career' }]);
    });
  });

  describe('optional extended fields entirely omitted (today\'s real 3-field Learning Intent response)', () => {
    const minimalIntent: CareerSearchIntent = {
      condensedAlgoliaQuery: '',
      skillsRequired: ['JavaScript'],
      skillsPreferred: ['AWS'],
    };

    it('still falls back to the first required skill when condensedAlgoliaQuery is blank and roles is omitted', async () => {
      mockFacetSnapshot();
      mockSearchResolvedValue([SOME_CAREER_HIT]);

      await careerRetrievalService.searchCareers(mockIndex, minimalIntent);

      const [, ladderArgs] = (mockIndex.search as jest.Mock).mock.calls;
      expect(ladderArgs[0]).toBe('JavaScript');
    });

    it('builds facetFilters from the grounded required skill alone when industries/jobSources/excludeTags are all omitted', async () => {
      mockFacetSnapshot(['JavaScript']);
      mockSearchResolvedValue([SOME_CAREER_HIT]);

      await careerRetrievalService.searchCareers(mockIndex, minimalIntent);

      const [, params] = (mockIndex.search as jest.Mock).mock.calls[1];
      expect(params.facetFilters).toEqual([['skills.name:JavaScript']]);
    });

    it('still includes preferred skills (not suppressed) when learnerLevel is omitted', async () => {
      mockFacetSnapshot(['JavaScript', 'AWS']);
      mockSearchResolvedValue([SOME_CAREER_HIT]);

      await careerRetrievalService.searchCareers(mockIndex, minimalIntent);

      const [, params] = (mockIndex.search as jest.Mock).mock.calls[1];
      expect(params.optionalFilters).toEqual(['skills.name:AWS<score=1>']);
    });
  });

  describe('failure behavior', () => {
    it('propagates a rejected Algolia search instead of resolving to an empty array', async () => {
      const searchError = new Error('Algolia service unavailable');
      (mockIndex.search as jest.Mock).mockRejectedValueOnce(searchError);

      await expect(careerRetrievalService.searchCareers(mockIndex, DEFAULT_INTENT)).rejects.toThrow(searchError);
    });
  });

  describe('progressive facet-loosening ladder', () => {
    // Has real signal in query, strict facet (industries + a grounded required skill),
    // and boost facet (a grounded preferred skill), so every one of the four ladder
    // steps is distinguishable from the ones before it.
    const richIntent: CareerSearchIntent = {
      ...DEFAULT_INTENT,
      condensedAlgoliaQuery: 'Software Engineer',
      industries: ['Tech'],
      skillsRequired: ['React'],
      skillsPreferred: ['GraphQL'],
    };
    const mockRichFacetSnapshot = () => mockFacetSnapshot(['React', 'GraphQL']);

    it('Step 1 (strict + boost + query) returns matches immediately, issuing exactly one ladder request', async () => {
      mockRichFacetSnapshot();
      mockSearchResolvedValue([SOME_CAREER_HIT]);

      const careers = await careerRetrievalService.searchCareers(mockIndex, richIntent);

      expect(careers).toEqual([{ id: '1', title: 'Some Career' }]);
      expect(mockIndex.search).toHaveBeenCalledTimes(2);
    });

    it('Step 1 still executes with an empty query when a real strict facetFilters group is present', async () => {
      mockFacetSnapshot();
      mockSearchResolvedValue([SOME_CAREER_HIT]);

      const careers = await careerRetrievalService.searchCareers(mockIndex, {
        ...DEFAULT_INTENT,
        industries: ['Tech'],
      });

      expect(careers).toEqual([{ id: '1', title: 'Some Career' }]);
      expect(mockIndex.search).toHaveBeenCalledTimes(2);
      const [, ladderArgs] = (mockIndex.search as jest.Mock).mock.calls;
      expect(ladderArgs[0]).toBe('');
      expect(ladderArgs[1]).toEqual({ hitsPerPage: 10, facetFilters: [['industry_names:Tech']] });
    });

    it('skips Steps 1 and 2 when translation yields an empty query with only boost skills, landing on Step 3 (boost only)', async () => {
      // The real classification's fallback-promotion always moves at least one boost
      // skill to strict whenever zero strict skills survive grounding, so this exact
      // "empty query, boost-only" state can't be produced through a realistic
      // CareerSearchIntent/facet-snapshot combination — it's stubbed directly here to
      // exercise the guard itself, per the required regression coverage for this case.
      mockFacetSnapshot();
      const translateSpy = jest.spyOn(careerSkillTranslation, 'translateCareerSkillsToCatalog').mockReturnValue({
        strictSkillFilters: [],
        boostSkillFilters: [{ catalogSkill: 'AWS', catalogField: 'skills.name' }],
      });
      mockSearchResolvedValue([SOME_CAREER_HIT]);

      const careers = await careerRetrievalService.searchCareers(mockIndex, DEFAULT_INTENT);

      expect(careers).toEqual([{ id: '1', title: 'Some Career' }]);
      expect(mockIndex.search).toHaveBeenCalledTimes(2);
      const [, ladderArgs] = (mockIndex.search as jest.Mock).mock.calls;
      expect(ladderArgs[0]).toBe('');
      expect(ladderArgs[1]).toEqual({ hitsPerPage: 10, optionalFilters: ['skills.name:AWS<score=1>'] });

      translateSpy.mockRestore();
    });

    it('Step 2 (strict + boost, no query) wins when step 1 returns nothing, dropping only the query', async () => {
      mockRichFacetSnapshot();
      mockSearchResolvedValue([]);
      mockSearchResolvedValue([SOME_CAREER_HIT]);

      const careers = await careerRetrievalService.searchCareers(mockIndex, richIntent);

      expect(careers).toEqual([{ id: '1', title: 'Some Career' }]);
      expect(mockIndex.search).toHaveBeenCalledTimes(3);
      const [, , step2Args] = (mockIndex.search as jest.Mock).mock.calls;
      expect(step2Args[0]).toBe('');
      expect(step2Args[1]).toEqual({
        hitsPerPage: 10,
        facetFilters: [['industry_names:Tech'], ['skills.name:React']],
        optionalFilters: ['skills.name:GraphQL<score=1>'],
      });
    });

    it('Step 3 (boost only) wins when steps 1-2 return nothing, dropping the strict filter too', async () => {
      mockRichFacetSnapshot();
      mockSearchResolvedValue([]);
      mockSearchResolvedValue([]);
      mockSearchResolvedValue([SOME_CAREER_HIT]);

      const careers = await careerRetrievalService.searchCareers(mockIndex, richIntent);

      expect(careers).toEqual([{ id: '1', title: 'Some Career' }]);
      expect(mockIndex.search).toHaveBeenCalledTimes(4);
      const [, , , step3Args] = (mockIndex.search as jest.Mock).mock.calls;
      expect(step3Args[0]).toBe('');
      expect(step3Args[1]).toEqual({ hitsPerPage: 10, optionalFilters: ['skills.name:GraphQL<score=1>'] });
    });

    it('Step 4 (query only) wins when steps 1-3 return nothing, dropping every facet', async () => {
      mockRichFacetSnapshot();
      mockSearchResolvedValue([]);
      mockSearchResolvedValue([]);
      mockSearchResolvedValue([]);
      mockSearchResolvedValue([SOME_CAREER_HIT]);

      const careers = await careerRetrievalService.searchCareers(mockIndex, richIntent);

      expect(careers).toEqual([{ id: '1', title: 'Some Career' }]);
      expect(mockIndex.search).toHaveBeenCalledTimes(5);
      const [, , , , step4Args] = (mockIndex.search as jest.Mock).mock.calls;
      expect(step4Args[0]).toBe('Software Engineer');
      expect(step4Args[1]).toEqual({ hitsPerPage: 10 });
    });

    it('returns [] after exhausting all four steps, issuing no further request', async () => {
      mockRichFacetSnapshot();
      mockSearchResolvedValue([]);
      mockSearchResolvedValue([]);
      mockSearchResolvedValue([]);
      mockSearchResolvedValue([]);

      const careers = await careerRetrievalService.searchCareers(mockIndex, richIntent);

      expect(careers).toEqual([]);
      expect(mockIndex.search).toHaveBeenCalledTimes(5);
    });

    it('skips every later step when step 1 already is the query-only case, avoiding a redundant repeat request', async () => {
      // Only a query, no industries/jobSources/excludeTags/skills at all — step 1 is
      // already "query only," so steps 2-4 would all be identical to it and must be
      // skipped rather than repeating the same request.
      const queryOnlyIntent: CareerSearchIntent = {
        ...DEFAULT_INTENT,
        condensedAlgoliaQuery: 'Software Engineer',
      };
      mockFacetSnapshot();
      mockSearchResolvedValue([]);

      const careers = await careerRetrievalService.searchCareers(mockIndex, queryOnlyIntent);

      expect(careers).toEqual([]);
      expect(mockIndex.search).toHaveBeenCalledTimes(2);
    });

    it('propagates a rejection from a non-first ladder step instead of continuing the ladder', async () => {
      mockRichFacetSnapshot();
      mockSearchResolvedValue([]);
      const searchError = new Error('Algolia service unavailable');
      (mockIndex.search as jest.Mock).mockRejectedValueOnce(searchError);

      await expect(careerRetrievalService.searchCareers(mockIndex, richIntent)).rejects.toThrow(searchError);
      expect(mockIndex.search).toHaveBeenCalledTimes(3);
    });
  });
});
