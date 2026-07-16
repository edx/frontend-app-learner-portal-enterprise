import type { SearchIndex } from 'algoliasearch/lite';
import { careerRetrievalService } from './careerRetrieval';
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

describe('careerRetrievalService.searchCareers', () => {
  const mockIndex = {
    search: jest.fn(),
  } as unknown as SearchIndex;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockSearchResolvedValue = (hits: unknown[]) => {
    (mockIndex.search as jest.Mock).mockResolvedValueOnce({ hits });
  };

  describe('query construction and the one-call invariant', () => {
    it('uses the trimmed condensedAlgoliaQuery and calls search exactly once with the retrieval limit', async () => {
      mockSearchResolvedValue([]);

      await careerRetrievalService.searchCareers(mockIndex, {
        ...DEFAULT_INTENT,
        condensedAlgoliaQuery: '  Software Engineer  ',
      });

      expect(mockIndex.search).toHaveBeenCalledTimes(1);
      expect(mockIndex.search).toHaveBeenCalledWith('Software Engineer', expect.objectContaining({
        hitsPerPage: 10,
      }));
    });

    it('falls back to the first normalized role when condensedAlgoliaQuery is blank', async () => {
      mockSearchResolvedValue([]);

      await careerRetrievalService.searchCareers(mockIndex, {
        ...DEFAULT_INTENT,
        condensedAlgoliaQuery: '   ',
        roles: ['Developer'],
        skillsRequired: ['JavaScript'],
      });

      expect(mockIndex.search).toHaveBeenCalledWith('Developer', expect.anything());
    });

    it('falls back to the first normalized required skill when there are no roles', async () => {
      mockSearchResolvedValue([]);

      await careerRetrievalService.searchCareers(mockIndex, {
        ...DEFAULT_INTENT,
        roles: [],
        skillsRequired: ['JavaScript'],
      });

      expect(mockIndex.search).toHaveBeenCalledWith('JavaScript', expect.anything());
    });

    it('still makes one request with an empty string query when no term exists', async () => {
      mockSearchResolvedValue([]);

      await careerRetrievalService.searchCareers(mockIndex, DEFAULT_INTENT);

      expect(mockIndex.search).toHaveBeenCalledTimes(1);
      expect(mockIndex.search).toHaveBeenCalledWith('', expect.anything());
    });
  });

  describe('hard filters', () => {
    it('builds an industry_names OR clause from industries', async () => {
      mockSearchResolvedValue([]);

      await careerRetrievalService.searchCareers(mockIndex, {
        ...DEFAULT_INTENT,
        industries: ['Tech', 'Healthcare'],
      });

      const [, params] = (mockIndex.search as jest.Mock).mock.calls[0];
      expect(params.filters).toBe('(industry_names:"Tech" OR industry_names:"Healthcare")');
    });

    it('builds a job_sources OR clause from jobSources', async () => {
      mockSearchResolvedValue([]);

      await careerRetrievalService.searchCareers(mockIndex, {
        ...DEFAULT_INTENT,
        jobSources: ['LinkedIn'],
      });

      const [, params] = (mockIndex.search as jest.Mock).mock.calls[0];
      expect(params.filters).toBe('(job_sources:"LinkedIn")');
    });

    it('builds escaped NOT skills.name clauses from excludeTags', async () => {
      mockSearchResolvedValue([]);

      await careerRetrievalService.searchCareers(mockIndex, {
        ...DEFAULT_INTENT,
        excludeTags: ['PHP', 'tag"2'],
      });

      const [, params] = (mockIndex.search as jest.Mock).mock.calls[0];
      expect(params.filters).toBe('NOT skills.name:"PHP" AND NOT skills.name:"tag\\"2"');
    });

    it('omits filters entirely when no hard filter applies', async () => {
      mockSearchResolvedValue([]);

      await careerRetrievalService.searchCareers(mockIndex, DEFAULT_INTENT);

      const [, params] = (mockIndex.search as jest.Mock).mock.calls[0];
      expect(params.filters).toBeUndefined();
    });
  });

  describe('required/preferred skill optional filters', () => {
    it('adds required skills as unscored optional filters and preferred skills with score=1', async () => {
      mockSearchResolvedValue([]);

      await careerRetrievalService.searchCareers(mockIndex, {
        ...DEFAULT_INTENT,
        skillsRequired: ['React'],
        skillsPreferred: ['AWS'],
      });

      const [, params] = (mockIndex.search as jest.Mock).mock.calls[0];
      expect(params.optionalFilters).toEqual(['skills.name:"React"', 'skills.name:"AWS"<score=1>']);
    });

    it('deduplicates and ignores blank skill values', async () => {
      mockSearchResolvedValue([]);

      await careerRetrievalService.searchCareers(mockIndex, {
        ...DEFAULT_INTENT,
        skillsRequired: ['React', 'React', '  ', ''],
      });

      const [, params] = (mockIndex.search as jest.Mock).mock.calls[0];
      expect(params.optionalFilters).toEqual(['skills.name:"React"']);
    });

    it('drops malformed compound skill strings', async () => {
      mockSearchResolvedValue([]);

      await careerRetrievalService.searchCareers(mockIndex, {
        ...DEFAULT_INTENT,
        skillsRequired: ['Cloud Computing', 'SQL & Python'],
      });

      const [, params] = (mockIndex.search as jest.Mock).mock.calls[0];
      expect(params.optionalFilters).toEqual(['skills.name:"Cloud Computing"']);
    });

    it('caps required and preferred skills at their configured limits', async () => {
      mockSearchResolvedValue([]);

      await careerRetrievalService.searchCareers(mockIndex, {
        ...DEFAULT_INTENT,
        skillsRequired: ['A', 'B', 'C', 'D', 'E', 'F'],
        skillsPreferred: ['G', 'H', 'I'],
      });

      const [, params] = (mockIndex.search as jest.Mock).mock.calls[0];
      expect(params.optionalFilters).toHaveLength(6);
      expect(params.optionalFilters.filter((f: string) => f.includes('<score=1>'))).toHaveLength(2);
    });

    it('suppresses preferred skills entirely for introductory learners', async () => {
      mockSearchResolvedValue([]);

      await careerRetrievalService.searchCareers(mockIndex, {
        ...DEFAULT_INTENT,
        learnerLevel: 'introductory',
        skillsRequired: ['Cloud Computing'],
        skillsPreferred: ['AWS', 'Kubernetes'],
      });

      const [, params] = (mockIndex.search as jest.Mock).mock.calls[0];
      expect(params.optionalFilters).toEqual(['skills.name:"Cloud Computing"']);
    });

    it('omits optionalFilters entirely when no usable skill filters exist', async () => {
      mockSearchResolvedValue([]);

      await careerRetrievalService.searchCareers(mockIndex, DEFAULT_INTENT);

      const [, params] = (mockIndex.search as jest.Mock).mock.calls[0];
      expect(params.optionalFilters).toBeUndefined();
    });
  });

  describe('taxonomy mapping', () => {
    it('maps id, title, and skillsToDevelop, preserving hit order', async () => {
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
      mockSearchResolvedValue([{ objectID: 'obj-1', name: 'Nurse' }]);

      const careers = await careerRetrievalService.searchCareers(mockIndex, DEFAULT_INTENT);

      expect(careers).toEqual([{ id: 'obj-1', title: 'Nurse' }]);
    });

    it('does not leak raw, ranking, or Algolia response fields onto the mapped result', async () => {
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
    it('resolves zero hits to an empty array', async () => {
      mockSearchResolvedValue([]);

      const careers = await careerRetrievalService.searchCareers(mockIndex, DEFAULT_INTENT);

      expect(careers).toEqual([]);
    });

    it('skips hits missing both id and objectID', async () => {
      mockSearchResolvedValue([
        { name: 'No Identifier' },
        { id: '1', name: 'Valid Career' },
      ]);

      const careers = await careerRetrievalService.searchCareers(mockIndex, DEFAULT_INTENT);

      expect(careers).toEqual([{ id: '1', title: 'Valid Career' }]);
    });

    it('skips hits missing a name', async () => {
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
      mockSearchResolvedValue([]);

      await careerRetrievalService.searchCareers(mockIndex, minimalIntent);

      expect(mockIndex.search).toHaveBeenCalledWith('JavaScript', expect.anything());
    });

    it('omits filters entirely when industries/jobSources/excludeTags are all omitted', async () => {
      mockSearchResolvedValue([]);

      await careerRetrievalService.searchCareers(mockIndex, minimalIntent);

      const [, params] = (mockIndex.search as jest.Mock).mock.calls[0];
      expect(params.filters).toBeUndefined();
    });

    it('still includes preferred skills (not suppressed) when learnerLevel is omitted', async () => {
      mockSearchResolvedValue([]);

      await careerRetrievalService.searchCareers(mockIndex, minimalIntent);

      const [, params] = (mockIndex.search as jest.Mock).mock.calls[0];
      expect(params.optionalFilters).toEqual(['skills.name:"JavaScript"', 'skills.name:"AWS"<score=1>']);
    });
  });

  describe('failure behavior', () => {
    it('propagates a rejected Algolia search instead of resolving to an empty array', async () => {
      const searchError = new Error('Algolia service unavailable');
      (mockIndex.search as jest.Mock).mockRejectedValueOnce(searchError);

      await expect(careerRetrievalService.searchCareers(mockIndex, DEFAULT_INTENT)).rejects.toThrow(searchError);
    });
  });
});
