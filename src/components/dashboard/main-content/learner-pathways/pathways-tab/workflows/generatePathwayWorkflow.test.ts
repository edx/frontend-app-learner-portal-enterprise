import { fetchRecommendationFeedback } from '../../../../../app/data/services/xpert';
import { courseRetrievalService, getCourseAlgoliaIndex } from '../services';
import { generatePathwayWorkflow } from './generatePathwayWorkflow';
import type { GeneratePathwayWorkflowInput } from './types';
import type { CareerMatch, PathwayCourse, PathwayGenerationRequest } from '../state';

jest.mock('../../../../../app/data/services/xpert', () => ({ fetchRecommendationFeedback: jest.fn() }));
jest.mock('../services', () => ({
  courseRetrievalService: { searchCourses: jest.fn() },
  getCourseAlgoliaIndex: jest.fn(),
}));

const mockFetchRecommendationFeedback = fetchRecommendationFeedback as jest.Mock;
const mockSearchCourses = courseRetrievalService.searchCourses as jest.Mock;
const mockGetCourseAlgoliaIndex = getCourseAlgoliaIndex as jest.Mock;

const sentinelIndex = { search: jest.fn() };

const catalogScope = {
  searchCatalogs: ['cat-1'],
  catalogUuidsToCatalogQueryUuids: { 'cat-1': 'query-1' },
};

const selectedCareer: CareerMatch = {
  id: 'career-1',
  title: 'Data Analyst',
  skillsToDevelop: ['SQL', 'Tableau'],
};

const request: PathwayGenerationRequest = {
  learnerIntent: {
    careerGoal: 'Become a data analyst', targetIndustry: 'Technology', background: 'Ops', motivation: 'Growth',
  },
  learnerProfile: {
    summary: 's', learningStyle: 'Hands-on', weeklyTimeCommitment: '5 hours', certificatePreference: 'Preferred', skills: ['SQL', 'Excel', 'Python'],
  },
  selectedCareerId: 'career-1',
  selectedSkills: ['SQL', 'Excel'],
};

const buildInput = (overrides: Partial<GeneratePathwayWorkflowInput> = {}): GeneratePathwayWorkflowInput => ({
  request,
  selectedCareer,
  catalogScope,
  ...overrides,
});

const sampleCourses: PathwayCourse[] = [
  { courseKey: 'c1', title: 'Course 1', status: 'not_started' },
  { courseKey: 'c2', title: 'Course 2', status: 'not_started' },
];

describe('generatePathwayWorkflow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCourseAlgoliaIndex.mockReturnValue(sentinelIndex);
  });

  describe('successful orchestration and ordering', () => {
    it('resolves the course index, calls searchCourses once with the grounded projection, and preserves course order', async () => {
      mockSearchCourses.mockResolvedValueOnce(sampleCourses);
      mockFetchRecommendationFeedback.mockResolvedValueOnce({ reasons: { c1: 'Matches your SQL and Excel skills.' } });

      const result = await generatePathwayWorkflow(buildInput());

      expect(mockGetCourseAlgoliaIndex).toHaveBeenCalledTimes(1);
      expect(mockSearchCourses).toHaveBeenCalledTimes(1);
      expect(mockSearchCourses).toHaveBeenCalledWith(sentinelIndex, {
        selectedCareer: { title: 'Data Analyst', skillsToDevelop: ['SQL', 'Excel'] },
        intent: { skillsRequired: ['SQL', 'Excel'], skillsPreferred: ['Python'] },
        catalogScope,
      });

      expect(result.courses).toEqual([
        {
          courseKey: 'c1', title: 'Course 1', status: 'not_started', whyThisFitsYou: 'Matches your SQL and Excel skills.',
        },
        { courseKey: 'c2', title: 'Course 2', status: 'not_started' },
      ]);
    });

    it('never sends the career\'s full skillsToDevelop list to course retrieval — only the learner-approved selectedSkills', async () => {
      mockSearchCourses.mockResolvedValueOnce(sampleCourses);
      mockFetchRecommendationFeedback.mockResolvedValueOnce({ reasons: {} });

      await generatePathwayWorkflow(buildInput());

      const [, options] = mockSearchCourses.mock.calls[0];
      expect(options.selectedCareer.skillsToDevelop).not.toContain('Tableau');
    });

    it('calls fetchRecommendationFeedback once, only after searchCourses resolves, with the exact projection', async () => {
      mockSearchCourses.mockResolvedValueOnce(sampleCourses);
      mockFetchRecommendationFeedback.mockResolvedValueOnce({ reasons: {} });

      await generatePathwayWorkflow(buildInput());

      expect(mockFetchRecommendationFeedback).toHaveBeenCalledTimes(1);
      expect(mockFetchRecommendationFeedback).toHaveBeenCalledWith({
        selectedCareer: 'Data Analyst',
        courseKeys: ['c1', 'c2'],
        learnerProfile: request.learnerProfile,
      });

      const searchOrder = mockSearchCourses.mock.invocationCallOrder[0];
      const feedbackOrder = mockFetchRecommendationFeedback.mock.invocationCallOrder[0];
      expect(searchOrder).toBeLessThan(feedbackOrder);
    });

    it('sends a fresh learnerProfile object to Recommendation Feedback, not the same reference', async () => {
      mockSearchCourses.mockResolvedValueOnce(sampleCourses);
      mockFetchRecommendationFeedback.mockResolvedValueOnce({ reasons: {} });

      await generatePathwayWorkflow(buildInput());

      const [feedbackArgs] = mockFetchRecommendationFeedback.mock.calls[0];
      expect(feedbackArgs.learnerProfile).not.toBe(request.learnerProfile);
      expect(feedbackArgs.learnerProfile).toEqual(request.learnerProfile);
    });

    it('does not mutate the input request, selectedCareer, or the courses returned by searchCourses', async () => {
      const requestCopy = JSON.parse(JSON.stringify(request));
      const selectedCareerCopy = JSON.parse(JSON.stringify(selectedCareer));
      const coursesCopy = JSON.parse(JSON.stringify(sampleCourses));
      mockSearchCourses.mockResolvedValueOnce(sampleCourses);
      mockFetchRecommendationFeedback.mockResolvedValueOnce({ reasons: { c1: 'reason' } });

      await generatePathwayWorkflow(buildInput());

      expect(request).toEqual(requestCopy);
      expect(selectedCareer).toEqual(selectedCareerCopy);
      expect(sampleCourses).toEqual(coursesCopy);
    });
  });

  describe('strict sequencing', () => {
    it('does not call fetchRecommendationFeedback while searchCourses is still pending', async () => {
      let resolveSearch: (value: PathwayCourse[]) => void = () => {};
      mockSearchCourses.mockReturnValueOnce(new Promise((resolve) => {
        resolveSearch = resolve;
      }));
      mockFetchRecommendationFeedback.mockResolvedValueOnce({ reasons: {} });

      const promise = generatePathwayWorkflow(buildInput());

      expect(mockFetchRecommendationFeedback).not.toHaveBeenCalled();

      resolveSearch(sampleCourses);
      await promise;

      expect(mockFetchRecommendationFeedback).toHaveBeenCalledTimes(1);
    });
  });

  describe('Catalog Retrieval failure', () => {
    it('propagates the rejection and never calls Recommendation Feedback', async () => {
      const retrievalError = new Error('Algolia service unavailable');
      mockSearchCourses.mockRejectedValueOnce(retrievalError);

      await expect(generatePathwayWorkflow(buildInput())).rejects.toThrow(retrievalError);

      expect(mockFetchRecommendationFeedback).not.toHaveBeenCalled();
    });
  });

  describe('Recommendation Feedback failure', () => {
    it('propagates the rejection without returning unenriched courses as a fallback, and does not retry retrieval', async () => {
      mockSearchCourses.mockResolvedValueOnce(sampleCourses);
      const feedbackError = new Error('Recommendation feedback unavailable');
      mockFetchRecommendationFeedback.mockRejectedValueOnce(feedbackError);

      await expect(generatePathwayWorkflow(buildInput())).rejects.toThrow(feedbackError);

      expect(mockSearchCourses).toHaveBeenCalledTimes(1);
      expect(mockFetchRecommendationFeedback).toHaveBeenCalledTimes(1);
    });
  });

  describe('empty Catalog Retrieval result', () => {
    it('resolves to { courses: [] } without calling Recommendation Feedback', async () => {
      mockSearchCourses.mockResolvedValueOnce([]);

      const result = await generatePathwayWorkflow(buildInput());

      expect(result).toEqual({ courses: [] });
      expect(mockFetchRecommendationFeedback).not.toHaveBeenCalled();
    });
  });

  describe('feedback/result join', () => {
    it('leaves whyThisFitsYou absent for a course with no matching reason', async () => {
      mockSearchCourses.mockResolvedValueOnce(sampleCourses);
      mockFetchRecommendationFeedback.mockResolvedValueOnce({ reasons: { c1: 'reason for c1' } });

      const result = await generatePathwayWorkflow(buildInput());

      expect(result.courses[1]).not.toHaveProperty('whyThisFitsYou');
    });

    it('ignores extra reason keys that do not correspond to any returned course', async () => {
      mockSearchCourses.mockResolvedValueOnce(sampleCourses);
      mockFetchRecommendationFeedback.mockResolvedValueOnce({
        reasons: { c1: 'reason for c1', 'unrelated-course': 'should be ignored' },
      });

      const result = await generatePathwayWorkflow(buildInput());

      expect(result.courses).toHaveLength(2);
      expect(result.courses.find((c) => c.courseKey === 'unrelated-course')).toBeUndefined();
    });

    it('preserves Catalog Retrieval order regardless of the reasons object key order', async () => {
      mockSearchCourses.mockResolvedValueOnce(sampleCourses);
      mockFetchRecommendationFeedback.mockResolvedValueOnce({
        reasons: { c2: 'reason for c2', c1: 'reason for c1' },
      });

      const result = await generatePathwayWorkflow(buildInput());

      expect(result.courses.map((c) => c.courseKey)).toEqual(['c1', 'c2']);
    });

    it('does not expose the raw feedback response on the workflow result', async () => {
      mockSearchCourses.mockResolvedValueOnce(sampleCourses);
      mockFetchRecommendationFeedback.mockResolvedValueOnce({ reasons: { c1: 'reason' } });

      const result = await generatePathwayWorkflow(buildInput());

      expect(result).not.toHaveProperty('reasons');
      expect(result).toEqual({ courses: expect.any(Array) });
    });
  });

  describe('course-search intent adapter', () => {
    it('uses selected skills as skillsRequired and non-overlapping profile skills as skillsPreferred', async () => {
      mockSearchCourses.mockResolvedValueOnce(sampleCourses);
      mockFetchRecommendationFeedback.mockResolvedValueOnce({ reasons: {} });

      await generatePathwayWorkflow(buildInput());

      const [, options] = mockSearchCourses.mock.calls[0];
      expect(options.intent.skillsRequired).toEqual(['SQL', 'Excel']);
      expect(options.intent.skillsPreferred).toEqual(['Python']);
    });

    it('removes overlap case-insensitively, with selected-skill priority winning', async () => {
      const overlapRequest: PathwayGenerationRequest = {
        ...request,
        selectedSkills: ['sql'],
        learnerProfile: { ...request.learnerProfile, skills: ['SQL', 'Excel'] },
      };
      mockSearchCourses.mockResolvedValueOnce(sampleCourses);
      mockFetchRecommendationFeedback.mockResolvedValueOnce({ reasons: {} });

      await generatePathwayWorkflow(buildInput({ request: overlapRequest }));

      const [, options] = mockSearchCourses.mock.calls[0];
      expect(options.intent.skillsRequired).toEqual(['sql']);
      expect(options.intent.skillsPreferred).toEqual(['Excel']);
    });

    it('never includes learnerLevel, roles, industries, jobSources, timeCommitment, excludeTags, or condensedAlgoliaQuery', async () => {
      mockSearchCourses.mockResolvedValueOnce(sampleCourses);
      mockFetchRecommendationFeedback.mockResolvedValueOnce({ reasons: {} });

      await generatePathwayWorkflow(buildInput());

      const [, options] = mockSearchCourses.mock.calls[0];
      expect(Object.keys(options.intent).sort()).toEqual(['skillsPreferred', 'skillsRequired']);
    });
  });
});
