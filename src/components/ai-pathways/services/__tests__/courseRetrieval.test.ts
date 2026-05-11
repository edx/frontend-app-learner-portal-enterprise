import { courseRetrievalService } from '../courseRetrieval';
import { CatalogTranslation } from '../../types';

const mockSearch = jest.fn();
const mockIndex = { search: mockSearch } as any;

describe('courseRetrievalService', () => {
  /** Facet-first mode: skills mapped, query is empty string. */
  const facetFirstTranslation: CatalogTranslation = {
    query: '',
    queryAlternates: ['Software Engineer'],
    strictSkillFilters: [
      {
        taxonomySkill: 'Python', catalogSkill: 'Python', catalogField: 'skill_names', matchMethod: 'exact',
      },
      {
        taxonomySkill: 'SQL', catalogSkill: 'SQL', catalogField: 'skill_names', matchMethod: 'exact',
      },
    ],
    boostSkillFilters: [],
    droppedTaxonomySkills: [],
    skillProvenance: [],
  };

  /** Text-fallback mode: no skills mapped, query is the career title. */
  const textFallbackTranslation: CatalogTranslation = {
    query: 'Quantum Engineer',
    queryAlternates: [],
    strictSkillFilters: [],
    boostSkillFilters: [],
    droppedTaxonomySkills: ['ObscureTechA'],
    skillProvenance: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('step 1: facet-first (all skills)', () => {
    it('calls search with empty string query and all skills as OR facetFilters', async () => {
      mockSearch.mockResolvedValueOnce({
        hits: Array(3).fill({ objectID: 'c', title: 'Course' }),
      });

      const { courses } = await courseRetrievalService.fetchCourses(facetFirstTranslation, mockIndex);

      expect(mockSearch).toHaveBeenCalledTimes(1);
      expect(mockSearch).toHaveBeenCalledWith('', expect.objectContaining({
        facetFilters: expect.arrayContaining([
          expect.arrayContaining(['skill_names:"Python"', 'skill_names:"SQL"']),
        ]),
      }));
      expect(courses).toHaveLength(3);
    });

    it('returns step-1 results when hit count meets MIN_RESULTS_THRESHOLD (3)', async () => {
      mockSearch.mockResolvedValueOnce({ hits: Array(3).fill({ objectID: 'c', title: 'Course' }) });
      const { ladderTrace } = await courseRetrievalService.fetchCourses(facetFirstTranslation, mockIndex);
      expect(ladderTrace.winnerStep).toBe(1);
    });
  });

  describe('step 2: facet-first (top skills)', () => {
    it('falls through to step 2 using facetFilters with reduced skill set', async () => {
      mockSearch.mockResolvedValueOnce({ hits: [] }); // step 1: miss
      mockSearch.mockResolvedValueOnce({ hits: Array(4).fill({ objectID: 'c', title: 'Course' }) }); // step 2: hit

      const { ladderTrace } = await courseRetrievalService.fetchCourses(facetFirstTranslation, mockIndex);

      expect(mockSearch).toHaveBeenCalledTimes(2);
      // Step 2 must use facetFilters (not optionalFilters)
      const step2Call = mockSearch.mock.calls[1];
      const step2Params = step2Call[1];
      expect(step2Params).toHaveProperty('facetFilters');
      expect(step2Params).not.toHaveProperty('optionalFilters');
      expect(ladderTrace.winnerStep).toBe(2);
    });
  });

  describe('step 3: text fallback', () => {
    it('uses careerTitle from queryAlternates as the text query', async () => {
      mockSearch.mockResolvedValueOnce({ hits: [] }); // step 1
      mockSearch.mockResolvedValueOnce({ hits: [] }); // step 2
      mockSearch.mockResolvedValueOnce({ hits: Array(3).fill({ objectID: 'c', title: 'Course' }) }); // step 3

      const { courses, ladderTrace } = await courseRetrievalService.fetchCourses(facetFirstTranslation, mockIndex);

      expect(mockSearch).toHaveBeenCalledTimes(3);
      expect(mockSearch.mock.calls[2][0]).toBe('Software Engineer');
      expect(courses).toHaveLength(3);
      expect(ladderTrace.winnerStep).toBe(3);
    });

    it('uses query directly when in text-fallback mode (no skills mapped)', async () => {
      mockSearch.mockResolvedValueOnce({ hits: Array(3).fill({ objectID: 'c', title: 'Course' }) });

      const { courses } = await courseRetrievalService.fetchCourses(textFallbackTranslation, mockIndex);
      expect(courses).toHaveLength(3);
    });
  });

  describe('step 4: scope-only fallback', () => {
    it('returns scope-only results when all earlier steps produce too few results', async () => {
      mockSearch
        .mockResolvedValueOnce({ hits: [] }) // step 1: strict facets miss
        .mockResolvedValueOnce({ hits: [] }) // step 2: reduced facets miss
        .mockResolvedValueOnce({ hits: [] }) // step 3: text fallback miss
        .mockResolvedValueOnce({ hits: [{ objectID: 'fallback', title: 'Fallback Course' }] }); // step 4

      const { courses, ladderTrace } = await courseRetrievalService.fetchCourses(facetFirstTranslation, mockIndex);
      expect(courses[0].id).toBe('fallback');
      expect(ladderTrace.winnerStep).toBe(4);
    });
  });

  describe('error handling', () => {
    it('returns empty courses and null winnerStep on Algolia error', async () => {
      mockSearch.mockRejectedValueOnce(new Error('Algolia error'));
      const { courses, ladderTrace } = await courseRetrievalService.fetchCourses(facetFirstTranslation, mockIndex);
      expect(courses).toEqual([]);
      expect(ladderTrace.winnerStep).toBeNull();
    });
  });
});
