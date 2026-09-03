import { fetchLearningIntent } from '../../../../../app/data/services/xpert';
import { getCourseAlgoliaIndex, searchCoursesForSkillsPathway } from '../services';
import { generateSkillsPathwayWorkflow } from './generateSkillsPathwayWorkflow';
import type { LearnerIntent, PathwayCourse } from '../state';

jest.mock('../../../../../app/data/services/xpert', () => ({ fetchLearningIntent: jest.fn() }));
jest.mock('../services', () => ({
  getCourseAlgoliaIndex: jest.fn(),
  searchCoursesForSkillsPathway: jest.fn(),
}));

const mockFetchLearningIntent = fetchLearningIntent as jest.Mock;
const mockGetCourseAlgoliaIndex = getCourseAlgoliaIndex as jest.Mock;
const mockSearchCoursesForSkillsPathway = searchCoursesForSkillsPathway as jest.Mock;

const sentinelIndex = { search: jest.fn() };

const learnerIntent: LearnerIntent = {
  careerGoal: 'Become a data analyst', targetIndustry: 'Technology', background: 'Ops', motivation: 'Growth',
};

const catalogScope = {
  searchCatalogs: ['cat-1'],
  catalogUuidsToCatalogQueryUuids: { 'cat-1': 'query-1' },
};

const learningIntentResponse = {
  skillsRequired: ['SQL'],
  skillsPreferred: ['Excel'],
  condensedAlgoliaQuery: 'sql data analysis',
};

const sampleCourses: PathwayCourse[] = [
  { courseKey: 'c1', title: 'Course 1', status: 'not_started' },
  { courseKey: 'c2', title: 'Course 2', status: 'not_started' },
];

describe('generateSkillsPathwayWorkflow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCourseAlgoliaIndex.mockReturnValue(sentinelIndex);
  });

  it('calls Learning Intent exactly once, then the skills retrieval entry point with its exact response', async () => {
    mockFetchLearningIntent.mockResolvedValueOnce(learningIntentResponse);
    mockSearchCoursesForSkillsPathway.mockResolvedValueOnce(sampleCourses);

    const result = await generateSkillsPathwayWorkflow({ learnerIntent, catalogScope });

    expect(mockFetchLearningIntent).toHaveBeenCalledTimes(1);
    expect(mockFetchLearningIntent).toHaveBeenCalledWith(learnerIntent);

    expect(mockGetCourseAlgoliaIndex).toHaveBeenCalledTimes(1);
    expect(mockSearchCoursesForSkillsPathway).toHaveBeenCalledTimes(1);
    expect(mockSearchCoursesForSkillsPathway).toHaveBeenCalledWith({
      index: sentinelIndex,
      learningIntent: learningIntentResponse,
      catalogScope,
    });

    expect(result).toEqual({ courses: sampleCourses });
  });

  it('calls Learning Intent before resolving the Algolia index or searching', async () => {
    mockFetchLearningIntent.mockResolvedValueOnce(learningIntentResponse);
    mockSearchCoursesForSkillsPathway.mockResolvedValueOnce(sampleCourses);

    await generateSkillsPathwayWorkflow({ learnerIntent, catalogScope });

    const learningIntentOrder = mockFetchLearningIntent.mock.invocationCallOrder[0];
    const indexOrder = mockGetCourseAlgoliaIndex.mock.invocationCallOrder[0];
    const searchOrder = mockSearchCoursesForSkillsPathway.mock.invocationCallOrder[0];

    expect(learningIntentOrder).toBeLessThan(indexOrder);
    expect(indexOrder).toBeLessThan(searchOrder);
  });

  it('resolves to an empty course list when the skills search finds nothing', async () => {
    mockFetchLearningIntent.mockResolvedValueOnce(learningIntentResponse);
    mockSearchCoursesForSkillsPathway.mockResolvedValueOnce([]);

    const result = await generateSkillsPathwayWorkflow({ learnerIntent, catalogScope });

    expect(result).toEqual({ courses: [] });
  });

  it('propagates a Learning Intent rejection and never calls the skills retrieval entry point', async () => {
    const error = new Error('Learning Intent unavailable');
    mockFetchLearningIntent.mockRejectedValueOnce(error);

    await expect(generateSkillsPathwayWorkflow({ learnerIntent, catalogScope })).rejects.toThrow(error);

    expect(mockGetCourseAlgoliaIndex).not.toHaveBeenCalled();
    expect(mockSearchCoursesForSkillsPathway).not.toHaveBeenCalled();
  });

  it('propagates a skills-search rejection untouched', async () => {
    mockFetchLearningIntent.mockResolvedValueOnce(learningIntentResponse);
    const error = new Error('Algolia unavailable');
    mockSearchCoursesForSkillsPathway.mockRejectedValueOnce(error);

    await expect(generateSkillsPathwayWorkflow({ learnerIntent, catalogScope })).rejects.toThrow(error);
  });

  it('result exposes only { courses } — no career, feedback, or catalog-inclusion diagnostics', async () => {
    mockFetchLearningIntent.mockResolvedValueOnce(learningIntentResponse);
    mockSearchCoursesForSkillsPathway.mockResolvedValueOnce(sampleCourses);

    const result = await generateSkillsPathwayWorkflow({ learnerIntent, catalogScope });

    expect(result).toEqual({ courses: expect.any(Array) });
    expect(Object.keys(result)).toEqual(['courses']);
  });
});
