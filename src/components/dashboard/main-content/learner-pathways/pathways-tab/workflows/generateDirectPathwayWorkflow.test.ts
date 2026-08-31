import { fetchRecommendationFeedback } from '../../../../../app/data/services/xpert';
import {
  directCourseKeyRetrievalService,
  fetchCourseMetadataByKeys,
  filterCourseKeysByEnterpriseCatalog,
  getCourseAlgoliaIndex,
  searchCoursesBySkillFallback,
} from '../services';
import { generateDirectPathwayWorkflow, DIRECT_PATHWAY_COURSE_LIMIT } from './generateDirectPathwayWorkflow';
import type { GenerateDirectPathwayWorkflowInput } from './types';
import type { LearnerIntent, PathwayCourse } from '../state';
import type { LearnerSkillFallback } from '../services';

jest.mock('../../../../../app/data/services/xpert', () => ({ fetchRecommendationFeedback: jest.fn() }));
jest.mock('../services', () => ({
  directCourseKeyRetrievalService: { retrieveCourseKeys: jest.fn() },
  filterCourseKeysByEnterpriseCatalog: jest.fn(),
  fetchCourseMetadataByKeys: jest.fn(),
  getCourseAlgoliaIndex: jest.fn(),
  searchCoursesBySkillFallback: jest.fn(),
}));

const mockRetrieveCourseKeys = directCourseKeyRetrievalService.retrieveCourseKeys as jest.Mock;
const mockFilterCourseKeysByEnterpriseCatalog = filterCourseKeysByEnterpriseCatalog as jest.Mock;
const mockFetchCourseMetadataByKeys = fetchCourseMetadataByKeys as jest.Mock;
const mockGetCourseAlgoliaIndex = getCourseAlgoliaIndex as jest.Mock;
const mockSearchCoursesBySkillFallback = searchCoursesBySkillFallback as jest.Mock;
const mockFetchRecommendationFeedback = fetchRecommendationFeedback as jest.Mock;

const sentinelIndex = { search: jest.fn() };

const learnerIntent: LearnerIntent = {
  careerGoal: 'Become a data analyst', targetIndustry: 'Technology', background: 'Ops', motivation: 'Growth',
};

const catalogScope = {
  searchCatalogs: ['cat-1'],
  catalogUuidsToCatalogQueryUuids: { 'cat-1': 'query-1' },
};

const buildInput = (
  overrides: Partial<GenerateDirectPathwayWorkflowInput> = {},
): GenerateDirectPathwayWorkflowInput => ({
  learnerIntent,
  enterpriseCustomerUuid: 'enterprise-uuid-1',
  catalogScope,
  ...overrides,
});

const sampleCourses: PathwayCourse[] = [
  { courseKey: 'c1', title: 'Course 1', status: 'not_started' },
  { courseKey: 'c2', title: 'Course 2', status: 'not_started' },
];

const groundedResult = (courseKeys: string[]) => ({
  retrievalStrategy: 'discovery_course_keys' as const, courseKeys, fallback: null,
});

const sampleFallback: LearnerSkillFallback = {
  skillsRequired: ['Python'],
  skillsPreferred: [],
  condensedAlgoliaQuery: 'python data analysis',
  roles: [],
  industries: [],
  jobSources: [],
  learnerLevel: 'introductory',
  timeCommitment: 'medium',
  excludeTags: [],
};

const fallbackResult = (fallback: LearnerSkillFallback = sampleFallback) => ({
  retrievalStrategy: 'algolia_skills_fallback' as const, courseKeys: [] as never[], fallback,
});

describe('generateDirectPathwayWorkflow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCourseAlgoliaIndex.mockReturnValue(sentinelIndex);
  });

  describe('successful orchestration and ordering (discovery_course_keys)', () => {
    it('calls each service exactly once with the exact expected arguments', async () => {
      mockRetrieveCourseKeys.mockResolvedValueOnce(groundedResult(['c1', 'c2']));
      mockFilterCourseKeysByEnterpriseCatalog.mockResolvedValueOnce(['c1', 'c2']);
      mockFetchCourseMetadataByKeys.mockResolvedValueOnce(sampleCourses);
      mockFetchRecommendationFeedback.mockResolvedValueOnce({ reasons: { c1: 'Matches your goal.' } });

      const result = await generateDirectPathwayWorkflow(buildInput());

      expect(mockRetrieveCourseKeys).toHaveBeenCalledTimes(1);
      expect(mockRetrieveCourseKeys).toHaveBeenCalledWith(learnerIntent);

      expect(mockFilterCourseKeysByEnterpriseCatalog).toHaveBeenCalledTimes(1);
      expect(mockFilterCourseKeysByEnterpriseCatalog).toHaveBeenCalledWith({
        enterpriseCustomerUuid: 'enterprise-uuid-1',
        catalogUuids: ['cat-1'],
        candidateCourseKeys: ['c1', 'c2'],
      });

      expect(mockGetCourseAlgoliaIndex).toHaveBeenCalledTimes(1);
      expect(mockFetchCourseMetadataByKeys).toHaveBeenCalledTimes(1);
      expect(mockFetchCourseMetadataByKeys).toHaveBeenCalledWith({
        index: sentinelIndex,
        courseKeys: ['c1', 'c2'],
        catalogScope,
      });
      expect(mockSearchCoursesBySkillFallback).not.toHaveBeenCalled();

      expect(mockFetchRecommendationFeedback).toHaveBeenCalledTimes(1);
      expect(mockFetchRecommendationFeedback).toHaveBeenCalledWith({
        selectedCareer: 'Become a data analyst',
        courseKeys: ['c1', 'c2'],
        learnerProfile: {
          careerGoal: 'Become a data analyst', targetIndustry: 'Technology', background: 'Ops', motivation: 'Growth',
        },
      });

      expect(result.courses).toEqual([
        {
          courseKey: 'c1', title: 'Course 1', status: 'not_started', whyThisFitsYou: 'Matches your goal.',
        },
        { courseKey: 'c2', title: 'Course 2', status: 'not_started' },
      ]);
    });

    it('sends ALL candidates (uncapped) to the catalog filter, then caps only the eligible subset at DIRECT_PATHWAY_COURSE_LIMIT before metadata hydration', async () => {
      const candidates = Array.from({ length: 20 }, (_, i) => `c${i}`);
      const eligible = candidates.slice(0, 8); // more than the 5-course limit
      mockRetrieveCourseKeys.mockResolvedValueOnce(groundedResult(candidates));
      mockFilterCourseKeysByEnterpriseCatalog.mockResolvedValueOnce(eligible);
      mockFetchCourseMetadataByKeys.mockResolvedValueOnce([]);

      await generateDirectPathwayWorkflow(buildInput());

      expect(mockFilterCourseKeysByEnterpriseCatalog).toHaveBeenCalledWith(
        expect.objectContaining({ candidateCourseKeys: candidates }),
      );
      expect(DIRECT_PATHWAY_COURSE_LIMIT).toBe(5);
      const [{ courseKeys: metadataKeys }] = mockFetchCourseMetadataByKeys.mock.calls[0];
      expect(metadataKeys).toEqual(eligible.slice(0, DIRECT_PATHWAY_COURSE_LIMIT));
    });

    it('calls the services in strict order: retrieve < filter < index resolution < metadata < feedback', async () => {
      mockRetrieveCourseKeys.mockResolvedValueOnce(groundedResult(['c1']));
      mockFilterCourseKeysByEnterpriseCatalog.mockResolvedValueOnce(['c1']);
      mockFetchCourseMetadataByKeys.mockResolvedValueOnce([sampleCourses[0]]);
      mockFetchRecommendationFeedback.mockResolvedValueOnce({ reasons: {} });

      await generateDirectPathwayWorkflow(buildInput());

      const retrieveOrder = mockRetrieveCourseKeys.mock.invocationCallOrder[0];
      const filterOrder = mockFilterCourseKeysByEnterpriseCatalog.mock.invocationCallOrder[0];
      const indexOrder = mockGetCourseAlgoliaIndex.mock.invocationCallOrder[0];
      const metadataOrder = mockFetchCourseMetadataByKeys.mock.invocationCallOrder[0];
      const feedbackOrder = mockFetchRecommendationFeedback.mock.invocationCallOrder[0];

      expect(retrieveOrder).toBeLessThan(filterOrder);
      expect(filterOrder).toBeLessThan(indexOrder);
      expect(indexOrder).toBeLessThan(metadataOrder);
      expect(metadataOrder).toBeLessThan(feedbackOrder);
    });

    it('sends only successfully hydrated keys to Recommendation Feedback when fewer than the requested five resolve', async () => {
      mockRetrieveCourseKeys.mockResolvedValueOnce(groundedResult(['c1', 'c2', 'c3', 'c4', 'c5']));
      mockFilterCourseKeysByEnterpriseCatalog.mockResolvedValueOnce(['c1', 'c2', 'c3', 'c4', 'c5']);
      const hydrated: PathwayCourse[] = [
        { courseKey: 'c1', title: 'Course 1', status: 'not_started' },
        { courseKey: 'c3', title: 'Course 3', status: 'not_started' },
      ];
      mockFetchCourseMetadataByKeys.mockResolvedValueOnce(hydrated);
      mockFetchRecommendationFeedback.mockResolvedValueOnce({ reasons: {} });

      await generateDirectPathwayWorkflow(buildInput());

      expect(mockFetchRecommendationFeedback).toHaveBeenCalledWith(
        expect.objectContaining({ courseKeys: ['c1', 'c3'] }),
      );
    });

    it('projects Recommendation Feedback input from learnerIntent.careerGoal and exactly the four canonical fields', async () => {
      mockRetrieveCourseKeys.mockResolvedValueOnce(groundedResult(['c1']));
      mockFilterCourseKeysByEnterpriseCatalog.mockResolvedValueOnce(['c1']);
      mockFetchCourseMetadataByKeys.mockResolvedValueOnce([sampleCourses[0]]);
      mockFetchRecommendationFeedback.mockResolvedValueOnce({ reasons: {} });

      await generateDirectPathwayWorkflow(buildInput());

      const [feedbackArgs] = mockFetchRecommendationFeedback.mock.calls[0];
      expect(feedbackArgs.selectedCareer).toBe(learnerIntent.careerGoal);
      expect(Object.keys(feedbackArgs.learnerProfile).sort()).toEqual([
        'background', 'careerGoal', 'motivation', 'targetIndustry',
      ]);
      expect(feedbackArgs.learnerProfile).toEqual(learnerIntent);
      expect(feedbackArgs.learnerProfile).not.toBe(learnerIntent);
    });

    it('does not mutate learnerIntent or the courses returned by metadata hydration', async () => {
      const learnerIntentCopy = { ...learnerIntent };
      const coursesCopy = JSON.parse(JSON.stringify(sampleCourses));
      mockRetrieveCourseKeys.mockResolvedValueOnce(groundedResult(['c1', 'c2']));
      mockFilterCourseKeysByEnterpriseCatalog.mockResolvedValueOnce(['c1', 'c2']);
      mockFetchCourseMetadataByKeys.mockResolvedValueOnce(sampleCourses);
      mockFetchRecommendationFeedback.mockResolvedValueOnce({ reasons: { c1: 'reason' } });

      await generateDirectPathwayWorkflow(buildInput());

      expect(learnerIntent).toEqual(learnerIntentCopy);
      expect(sampleCourses).toEqual(coursesCopy);
    });
  });

  describe('algolia_skills_fallback branch', () => {
    it('resolves the Algolia index and calls searchCoursesBySkillFallback with the fallback object and catalog scope, then enriches via feedback', async () => {
      mockRetrieveCourseKeys.mockResolvedValueOnce(fallbackResult());
      mockSearchCoursesBySkillFallback.mockResolvedValueOnce(sampleCourses);
      mockFetchRecommendationFeedback.mockResolvedValueOnce({ reasons: { c1: 'Matches your goal.' } });

      const result = await generateDirectPathwayWorkflow(buildInput());

      expect(mockGetCourseAlgoliaIndex).toHaveBeenCalledTimes(1);
      expect(mockSearchCoursesBySkillFallback).toHaveBeenCalledTimes(1);
      expect(mockSearchCoursesBySkillFallback).toHaveBeenCalledWith({
        index: sentinelIndex,
        fallback: sampleFallback,
        catalogScope,
      });

      expect(mockFilterCourseKeysByEnterpriseCatalog).not.toHaveBeenCalled();
      expect(mockFetchCourseMetadataByKeys).not.toHaveBeenCalled();

      expect(mockFetchRecommendationFeedback).toHaveBeenCalledTimes(1);
      expect(mockFetchRecommendationFeedback).toHaveBeenCalledWith({
        selectedCareer: 'Become a data analyst',
        courseKeys: ['c1', 'c2'],
        learnerProfile: {
          careerGoal: 'Become a data analyst', targetIndustry: 'Technology', background: 'Ops', motivation: 'Growth',
        },
      });

      expect(result.courses).toEqual([
        {
          courseKey: 'c1', title: 'Course 1', status: 'not_started', whyThisFitsYou: 'Matches your goal.',
        },
        { courseKey: 'c2', title: 'Course 2', status: 'not_started' },
      ]);
    });

    it('resolves to { courses: [] } without calling feedback when the skills search returns no courses', async () => {
      mockRetrieveCourseKeys.mockResolvedValueOnce(fallbackResult());
      mockSearchCoursesBySkillFallback.mockResolvedValueOnce([]);

      const result = await generateDirectPathwayWorkflow(buildInput());

      expect(result).toEqual({ courses: [] });
      expect(mockFetchRecommendationFeedback).not.toHaveBeenCalled();
    });

    it('propagates a skills-search rejection and never calls feedback', async () => {
      mockRetrieveCourseKeys.mockResolvedValueOnce(fallbackResult());
      const error = new Error('Algolia unavailable');
      mockSearchCoursesBySkillFallback.mockRejectedValueOnce(error);

      await expect(generateDirectPathwayWorkflow(buildInput())).rejects.toThrow(error);

      expect(mockFetchRecommendationFeedback).not.toHaveBeenCalled();
    });
  });

  describe('empty candidate keys', () => {
    it('resolves to { courses: [] } without calling the catalog filter, metadata hydration, skills search, or feedback', async () => {
      mockRetrieveCourseKeys.mockResolvedValueOnce(groundedResult([]));

      const result = await generateDirectPathwayWorkflow(buildInput());

      expect(result).toEqual({ courses: [] });
      expect(mockFilterCourseKeysByEnterpriseCatalog).not.toHaveBeenCalled();
      expect(mockGetCourseAlgoliaIndex).not.toHaveBeenCalled();
      expect(mockFetchCourseMetadataByKeys).not.toHaveBeenCalled();
      expect(mockSearchCoursesBySkillFallback).not.toHaveBeenCalled();
      expect(mockFetchRecommendationFeedback).not.toHaveBeenCalled();
    });
  });

  describe('empty eligible keys', () => {
    it('resolves to { courses: [] } without calling metadata hydration or feedback', async () => {
      mockRetrieveCourseKeys.mockResolvedValueOnce(groundedResult(['c1']));
      mockFilterCourseKeysByEnterpriseCatalog.mockResolvedValueOnce([]);

      const result = await generateDirectPathwayWorkflow(buildInput());

      expect(result).toEqual({ courses: [] });
      expect(mockGetCourseAlgoliaIndex).not.toHaveBeenCalled();
      expect(mockFetchCourseMetadataByKeys).not.toHaveBeenCalled();
      expect(mockFetchRecommendationFeedback).not.toHaveBeenCalled();
    });
  });

  describe('empty hydrated metadata', () => {
    it('resolves to { courses: [] } without calling feedback', async () => {
      mockRetrieveCourseKeys.mockResolvedValueOnce(groundedResult(['c1']));
      mockFilterCourseKeysByEnterpriseCatalog.mockResolvedValueOnce(['c1']);
      mockFetchCourseMetadataByKeys.mockResolvedValueOnce([]);

      const result = await generateDirectPathwayWorkflow(buildInput());

      expect(result).toEqual({ courses: [] });
      expect(mockFetchRecommendationFeedback).not.toHaveBeenCalled();
    });
  });

  describe('failure propagation', () => {
    it('propagates a candidate-retrieval rejection and calls nothing downstream', async () => {
      const error = new Error('Xpert unavailable');
      mockRetrieveCourseKeys.mockRejectedValueOnce(error);

      await expect(generateDirectPathwayWorkflow(buildInput())).rejects.toThrow(error);

      expect(mockFilterCourseKeysByEnterpriseCatalog).not.toHaveBeenCalled();
      expect(mockFetchCourseMetadataByKeys).not.toHaveBeenCalled();
      expect(mockSearchCoursesBySkillFallback).not.toHaveBeenCalled();
      expect(mockFetchRecommendationFeedback).not.toHaveBeenCalled();
    });

    it('propagates a catalog-inclusion rejection and calls nothing downstream', async () => {
      mockRetrieveCourseKeys.mockResolvedValueOnce(groundedResult(['c1']));
      const error = new Error('Enterprise Catalog unavailable');
      mockFilterCourseKeysByEnterpriseCatalog.mockRejectedValueOnce(error);

      await expect(generateDirectPathwayWorkflow(buildInput())).rejects.toThrow(error);

      expect(mockFetchCourseMetadataByKeys).not.toHaveBeenCalled();
      expect(mockFetchRecommendationFeedback).not.toHaveBeenCalled();
    });

    it('propagates a metadata-hydration rejection and never calls feedback', async () => {
      mockRetrieveCourseKeys.mockResolvedValueOnce(groundedResult(['c1']));
      mockFilterCourseKeysByEnterpriseCatalog.mockResolvedValueOnce(['c1']);
      const error = new Error('Algolia unavailable');
      mockFetchCourseMetadataByKeys.mockRejectedValueOnce(error);

      await expect(generateDirectPathwayWorkflow(buildInput())).rejects.toThrow(error);

      expect(mockFetchRecommendationFeedback).not.toHaveBeenCalled();
    });

    it('propagates a Recommendation Feedback rejection without an unenriched fallback', async () => {
      mockRetrieveCourseKeys.mockResolvedValueOnce(groundedResult(['c1']));
      mockFilterCourseKeysByEnterpriseCatalog.mockResolvedValueOnce(['c1']);
      mockFetchCourseMetadataByKeys.mockResolvedValueOnce([sampleCourses[0]]);
      const error = new Error('Recommendation feedback unavailable');
      mockFetchRecommendationFeedback.mockRejectedValueOnce(error);

      await expect(generateDirectPathwayWorkflow(buildInput())).rejects.toThrow(error);
    });
  });

  describe('feedback/result join (shared enrichWithFeedback behavior)', () => {
    it('leaves whyThisFitsYou absent for a course with no matching reason', async () => {
      mockRetrieveCourseKeys.mockResolvedValueOnce(groundedResult(['c1', 'c2']));
      mockFilterCourseKeysByEnterpriseCatalog.mockResolvedValueOnce(['c1', 'c2']);
      mockFetchCourseMetadataByKeys.mockResolvedValueOnce(sampleCourses);
      mockFetchRecommendationFeedback.mockResolvedValueOnce({ reasons: { c1: 'reason for c1' } });

      const result = await generateDirectPathwayWorkflow(buildInput());

      expect(result.courses[1]).not.toHaveProperty('whyThisFitsYou');
    });

    it('preserves hydrated order regardless of reasons key order', async () => {
      mockRetrieveCourseKeys.mockResolvedValueOnce(groundedResult(['c1', 'c2']));
      mockFilterCourseKeysByEnterpriseCatalog.mockResolvedValueOnce(['c1', 'c2']);
      mockFetchCourseMetadataByKeys.mockResolvedValueOnce(sampleCourses);
      mockFetchRecommendationFeedback.mockResolvedValueOnce({
        reasons: { c2: 'reason for c2', c1: 'reason for c1' },
      });

      const result = await generateDirectPathwayWorkflow(buildInput());

      expect(result.courses.map((c) => c.courseKey)).toEqual(['c1', 'c2']);
    });

    it('result exposes only { courses }, no raw feedback/candidate diagnostics', async () => {
      mockRetrieveCourseKeys.mockResolvedValueOnce(groundedResult(['c1']));
      mockFilterCourseKeysByEnterpriseCatalog.mockResolvedValueOnce(['c1']);
      mockFetchCourseMetadataByKeys.mockResolvedValueOnce([sampleCourses[0]]);
      mockFetchRecommendationFeedback.mockResolvedValueOnce({ reasons: { c1: 'reason' } });

      const result = await generateDirectPathwayWorkflow(buildInput());

      expect(result).toEqual({ courses: expect.any(Array) });
      expect(result).not.toHaveProperty('retrievalStrategy');
      expect(result).not.toHaveProperty('reasons');
    });

    it('applies the same reason-join behavior on the Algolia skills fallback branch', async () => {
      mockRetrieveCourseKeys.mockResolvedValueOnce(fallbackResult());
      mockSearchCoursesBySkillFallback.mockResolvedValueOnce(sampleCourses);
      mockFetchRecommendationFeedback.mockResolvedValueOnce({ reasons: { c1: 'reason for c1' } });

      const result = await generateDirectPathwayWorkflow(buildInput());

      expect(result.courses[0]).toHaveProperty('whyThisFitsYou', 'reason for c1');
      expect(result.courses[1]).not.toHaveProperty('whyThisFitsYou');
    });
  });
});
