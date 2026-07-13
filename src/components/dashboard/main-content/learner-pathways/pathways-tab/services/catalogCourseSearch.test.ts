import { mapAlgoliaHitToPathwayCourse, searchLearnerPathwaysCourses } from './catalogCourseSearch';

const mockSearch = jest.fn();
const mockIndex = { search: mockSearch } as unknown as Parameters<typeof searchLearnerPathwaysCourses>[0]['index'];

const mockGetConfig = jest.fn();
jest.mock('@edx/frontend-platform/config', () => ({
  getConfig: () => mockGetConfig(),
}));

const BASE_FACET_FILTERS = [['content_type:course'], ['metadata_language:en']];

describe('searchLearnerPathwaysCourses', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetConfig.mockReturnValue({});
  });

  describe('Step 1: Hybrid Broad', () => {
    it('fires with strict facetFilters and boost optionalFilters, and wins (>= 3 hits) without falling through', async () => {
      mockSearch.mockResolvedValueOnce({
        hits: [
          { objectID: '1', title: 'A' }, { objectID: '2', title: 'B' }, { objectID: '3', title: 'C' },
        ],
      });

      await searchLearnerPathwaysCourses({
        index: mockIndex, query: 'sql python', strictSkills: ['SQL', 'Python'], boostSkills: ['Tableau'],
      });

      expect(mockSearch).toHaveBeenCalledTimes(1);
      expect(mockSearch).toHaveBeenCalledWith('sql python', {
        hitsPerPage: 5,
        page: 0,
        facetFilters: [...BASE_FACET_FILTERS, ['skill_names:"SQL"', 'skill_names:"Python"']],
        optionalFilters: ['skill_names:"Tableau"'],
      });
    });

    it('reranks winning hits: a strict-skill match outranks a boost-only match, with a stable tie-break on equal scores', async () => {
      const boostOnlyHit = { objectID: 'boost-only', title: 'Boost Only', skill_names: ['Tableau'] };
      const strictMatchHit = { objectID: 'strict-match', title: 'Strict Match', skill_names: ['SQL'] };
      const tiedHitA = { objectID: 'tied-a', title: 'Tied A', skill_names: [] };
      const tiedHitB = { objectID: 'tied-b', title: 'Tied B', skill_names: [] };
      mockSearch.mockResolvedValueOnce({ hits: [boostOnlyHit, tiedHitA, strictMatchHit, tiedHitB] });

      const result = await searchLearnerPathwaysCourses({
        index: mockIndex, query: 'sql', strictSkills: ['SQL'], boostSkills: ['Tableau'],
      });

      expect(result.map((h) => h.objectID)).toEqual(['strict-match', 'boost-only', 'tied-a', 'tied-b']);
    });

    it('omits the strict facetFilters group when only boost skills are provided', async () => {
      mockSearch.mockResolvedValueOnce({
        hits: [{ objectID: '1' }, { objectID: '2' }, { objectID: '3' }],
      });

      await searchLearnerPathwaysCourses({
        index: mockIndex, query: 'x', boostSkills: ['Tableau'],
      });

      const callArgs = mockSearch.mock.calls[0][1];
      expect(callArgs.facetFilters).toEqual(BASE_FACET_FILTERS);
      expect(callArgs.optionalFilters).toEqual(['skill_names:"Tableau"']);
    });

    it('caps strict skills at 4 and boost skills at 8', async () => {
      mockSearch.mockResolvedValueOnce({
        hits: [{ objectID: '1' }, { objectID: '2' }, { objectID: '3' }],
      });
      const strictSkills = ['SQL', 'Python', 'Excel', 'Tableau', 'R'];
      const boostSkills = Array.from({ length: 10 }, (_, i) => `Skill${i}`);

      await searchLearnerPathwaysCourses({
        index: mockIndex, query: 'x', strictSkills, boostSkills,
      });

      const callArgs = mockSearch.mock.calls[0][1];
      expect(callArgs.facetFilters[2]).toHaveLength(4);
      expect(callArgs.optionalFilters).toHaveLength(8);
    });

    it('escapes embedded double quotes in both strict and boost skill facets', async () => {
      mockSearch.mockResolvedValueOnce({
        hits: [{ objectID: '1' }, { objectID: '2' }, { objectID: '3' }],
      });

      await searchLearnerPathwaysCourses({
        index: mockIndex,
        query: 'x',
        strictSkills: ['Skill "With" Quotes'],
        boostSkills: ['Other "Quoted" Skill'],
      });

      const callArgs = mockSearch.mock.calls[0][1];
      expect(callArgs.facetFilters[2]).toEqual(['skill_names:"Skill \\"With\\" Quotes"']);
      expect(callArgs.optionalFilters).toEqual(['skill_names:"Other \\"Quoted\\" Skill"']);
    });

    it('adds the referenced-catalog facet when both stage override config keys are present', async () => {
      mockGetConfig.mockReturnValue({
        ALGOLIA_STAGE_APP_ID_OVERRIDE: 'test-app-id',
        ALGOLIA_STAGE_SEARCH_API_KEY_OVERRIDE: 'test-key',
      });
      mockSearch.mockResolvedValueOnce({
        hits: [{ objectID: '1' }, { objectID: '2' }, { objectID: '3' }],
      });

      await searchLearnerPathwaysCourses({ index: mockIndex, query: 'x', strictSkills: ['SQL'] });

      const callArgs = mockSearch.mock.calls[0][1];
      expect(callArgs.facetFilters[0]).toEqual(['content_type:course']);
      expect(callArgs.facetFilters[1]).toEqual(['enterprise_catalog_query_titles:Subscription']);
      expect(callArgs.facetFilters[2]).toEqual(['metadata_language:en']);
    });

    it('omits the referenced-catalog facet when only one override config key is present', async () => {
      mockGetConfig.mockReturnValue({
        ALGOLIA_STAGE_APP_ID_OVERRIDE: 'test-app-id',
        ALGOLIA_STAGE_SEARCH_API_KEY_OVERRIDE: '',
      });
      mockSearch.mockResolvedValueOnce({
        hits: [{ objectID: '1' }, { objectID: '2' }, { objectID: '3' }],
      });

      await searchLearnerPathwaysCourses({ index: mockIndex, query: 'x', strictSkills: ['SQL'] });

      const callArgs = mockSearch.mock.calls[0][1];
      expect(callArgs.facetFilters).toEqual([...BASE_FACET_FILTERS, ['skill_names:"SQL"']]);
    });

    it('is skipped entirely (no Algolia call) when there is no strict or boost skill signal', async () => {
      mockSearch.mockResolvedValueOnce({
        hits: [{ objectID: '1' }, { objectID: '2' }, { objectID: '3' }],
      });

      await searchLearnerPathwaysCourses({ index: mockIndex, query: 'Data Analyst' });

      // Only one call total (Step 2, since Step 1 was skipped) — proves Step 1 never fired.
      expect(mockSearch).toHaveBeenCalledTimes(1);
      const callArgs = mockSearch.mock.calls[0][1];
      expect(callArgs.facetFilters).toEqual(BASE_FACET_FILTERS);
      expect(callArgs).not.toHaveProperty('optionalFilters');
    });
  });

  describe('Step 2: Boosted Text Fallback', () => {
    it('wins when Step 1 has fewer than 3 hits, reranks, and omits the strict facetFilters group', async () => {
      mockSearch
        .mockResolvedValueOnce({ hits: [{ objectID: '1' }, { objectID: '2' }] }) // Step 1: 2 hits, not a winner
        .mockResolvedValueOnce({
          hits: [
            { objectID: 'boost', skill_names: ['Tableau'] },
            { objectID: 'strict', skill_names: ['SQL'] },
            { objectID: 'plain' },
          ],
        });

      const result = await searchLearnerPathwaysCourses({
        index: mockIndex, query: 'sql', strictSkills: ['SQL'], boostSkills: ['Tableau'],
      });

      expect(mockSearch).toHaveBeenCalledTimes(2);
      const step2Args = mockSearch.mock.calls[1][1];
      expect(step2Args.facetFilters).toEqual(BASE_FACET_FILTERS);
      expect(step2Args.optionalFilters).toEqual(['skill_names:"Tableau"']);
      expect(result.map((h) => h.objectID)).toEqual(['strict', 'boost', 'plain']);
    });
  });

  describe('Step 3: Career Text Fallback', () => {
    it('wins on the first query alternate when Steps 1 and 2 fall short, with no rerank (raw order) and no optionalFilters', async () => {
      mockSearch
        .mockResolvedValueOnce({ hits: [{ objectID: '1' }] }) // Step 1: 1 hit
        .mockResolvedValueOnce({ hits: [{ objectID: '1' }] }) // Step 2: 1 hit
        .mockResolvedValueOnce({
          hits: [
            { objectID: 'z', skill_names: ['Tableau'] },
            { objectID: 'a', skill_names: ['SQL'] },
            { objectID: 'm' },
          ],
        }); // Step 3, candidate 1: 3 hits, wins

      const result = await searchLearnerPathwaysCourses({
        index: mockIndex,
        query: 'sql',
        queryAlternates: ['Data Analyst'],
        strictSkills: ['SQL'],
        boostSkills: ['Tableau'],
      });

      expect(mockSearch).toHaveBeenCalledTimes(3);
      expect(mockSearch).toHaveBeenNthCalledWith(3, 'sql', expect.objectContaining({ facetFilters: BASE_FACET_FILTERS }));
      const step3Args = mockSearch.mock.calls[2][1];
      expect(step3Args).not.toHaveProperty('optionalFilters');
      // Raw Algolia order preserved — no rerank at Step 3.
      expect(result.map((h) => h.objectID)).toEqual(['z', 'a', 'm']);
    });
  });

  describe('Step 4: Scope Only Fallback', () => {
    it('wins unconditionally with an empty-string query and base facets only, even below the threshold', async () => {
      mockSearch
        .mockResolvedValueOnce({ hits: [{ objectID: '1' }] }) // Step 1
        .mockResolvedValueOnce({ hits: [{ objectID: '1' }] }) // Step 2
        .mockResolvedValueOnce({ hits: [{ objectID: '1' }] }) // Step 3, candidate 'sql'
        .mockResolvedValueOnce({ hits: [{ objectID: '1' }] }) // Step 3, candidate 'Data Analyst'
        .mockResolvedValueOnce({ hits: [{ objectID: 'fallback-1' }] }); // Step 4: only 1 hit, still wins

      const result = await searchLearnerPathwaysCourses({
        index: mockIndex,
        query: 'sql',
        queryAlternates: ['Data Analyst'],
        strictSkills: ['SQL'],
        boostSkills: ['Tableau'],
      });

      expect(mockSearch).toHaveBeenCalledTimes(5);
      expect(mockSearch).toHaveBeenNthCalledWith(5, '', { hitsPerPage: 5, page: 0, facetFilters: BASE_FACET_FILTERS });
      expect(result.map((h) => h.objectID)).toEqual(['fallback-1']);
    });
  });

  it("Step 2's skip guard: with no query, no alternates, and no boost skills, the ladder collapses straight to Step 3/4 (not currently reachable via generatePathwayWorkflow, whose buildCourseSearchQuery always returns a non-empty query, but covered directly since it's real, shipped code)", async () => {
    mockSearch.mockResolvedValue({ hits: [{ objectID: 'fallback' }] });

    const result = await searchLearnerPathwaysCourses({
      index: mockIndex, query: '', queryAlternates: [],
    });

    // Step 1 skipped (no skills), Step 2 skipped (no query/alternates/boost),
    // straight to Step 4 (empty candidates list in Step 3).
    expect(mockSearch).toHaveBeenCalledTimes(1);
    expect(mockSearch).toHaveBeenCalledWith('', { hitsPerPage: 5, page: 0, facetFilters: BASE_FACET_FILTERS });
    expect(result.map((h) => h.objectID)).toEqual(['fallback']);
  });
});

describe('mapAlgoliaHitToPathwayCourse', () => {
  it('maps hit.key to courseKey with no objectID fallback', () => {
    const result = mapAlgoliaHitToPathwayCourse({
      objectID: 'obj-1',
      key: 'course-v1:edX+DataX+1T2026',
      title: 'Intro to Data Analysis',
    });

    expect(result.courseKey).toBe('course-v1:edX+DataX+1T2026');
  });

  it('leaves courseKey undefined when hit.key is absent, rather than substituting objectID', () => {
    const result = mapAlgoliaHitToPathwayCourse({ objectID: 'obj-2', title: 'Course With No Key' });

    expect(result.courseKey).toBeUndefined();
  });

  it('uses objectID as the local row id regardless of courseKey', () => {
    const result = mapAlgoliaHitToPathwayCourse({
      objectID: 'obj-3',
      key: 'course-v1:edX+DataX+1T2026',
      title: 'Course',
    });

    expect(result.id).toBe('obj-3');
  });

  it('maps title, provider, level, and defaults status to not_started', () => {
    const result = mapAlgoliaHitToPathwayCourse({
      objectID: 'obj-4',
      key: 'course-v1:edX+ExampleX+1T2026',
      title: 'Example Course',
      level_type: 'Introductory',
      partners: [{ name: 'edX' }],
    });

    expect(result).toEqual({
      id: 'obj-4',
      courseKey: 'course-v1:edX+ExampleX+1T2026',
      title: 'Example Course',
      provider: 'edX',
      level: 'Introductory',
      status: 'not_started',
    });
  });

  it('does not invent values for missing optional fields', () => {
    const result = mapAlgoliaHitToPathwayCourse({ objectID: 'obj-5', title: 'Course' });

    expect(result.provider).toBeUndefined();
    expect(result.level).toBeUndefined();
  });
});
