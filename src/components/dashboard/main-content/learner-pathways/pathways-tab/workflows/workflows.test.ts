import { logError } from '@edx/frontend-platform/logging';

import { generatePathwayWorkflow, generateProfileWorkflow } from './index';
import { fetchLearningIntent, fetchRecommendationFeedback } from '../../../../../app/data/services';
import { searchTaxonomyCareers } from '../services/taxonomyCareerSearch';
import { searchLearnerPathwaysCourses } from '../services/catalogCourseSearch';

jest.mock('../../../../../app/data/services', () => ({
  fetchLearningIntent: jest.fn(),
  fetchRecommendationFeedback: jest.fn(),
}));

jest.mock('../services/taxonomyCareerSearch', () => {
  const actual = jest.requireActual('../services/taxonomyCareerSearch');
  return { ...actual, searchTaxonomyCareers: jest.fn() };
});

jest.mock('../services/catalogCourseSearch', () => {
  const actual = jest.requireActual('../services/catalogCourseSearch');
  return { ...actual, searchLearnerPathwaysCourses: jest.fn() };
});

jest.mock('@edx/frontend-platform/logging', () => ({
  ...jest.requireActual('@edx/frontend-platform/logging'),
  logError: jest.fn(),
}));

const mockJobIndex = {} as Parameters<typeof searchTaxonomyCareers>[0]['index'];
const mockCatalogIndex = {} as Parameters<typeof searchLearnerPathwaysCourses>[0]['index'];

const mockAnswers = {
  motivation: 'I want to grow into a data-focused role',
  goal: 'Become a data analyst',
  background: 'Five years in accounting',
  industry: 'Financial services',
};

const mockLearningIntentResponse = {
  skillsRequired: ['SQL', 'Python'],
  skillsPreferred: ['Data Visualization'],
  condensedAlgoliaQuery: 'data analysis sql python',
};

const mockTaxonomyHits = [
  {
    objectID: 'obj-career-1', id: 'career-1', name: 'Data Analyst', skills: [{ name: 'SQL' }],
  },
  { objectID: 'obj-career-2', name: 'Business Analyst', skills: [{ name: 'Excel' }] },
];

describe('generateProfileWorkflow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(fetchLearningIntent).mockResolvedValue(mockLearningIntentResponse);
    jest.mocked(searchTaxonomyCareers).mockResolvedValue(mockTaxonomyHits);
  });

  it('maps intake answers to the Learning Intent request', async () => {
    await generateProfileWorkflow({ answers: mockAnswers, jobIndex: mockJobIndex });

    expect(fetchLearningIntent).toHaveBeenCalledTimes(1);
    expect(fetchLearningIntent).toHaveBeenCalledWith({
      selectedGoals: 'Become a data analyst',
      freeText: 'I want to grow into a data-focused role',
      knownContext: JSON.stringify({
        background: 'Five years in accounting',
        industry: 'Financial services',
      }),
    });
  });

  it('calls taxonomy search only after Learning Intent resolves, with the condensed query', async () => {
    const callOrder: string[] = [];
    jest.mocked(fetchLearningIntent).mockImplementation(async () => {
      callOrder.push('fetchLearningIntent');
      return mockLearningIntentResponse;
    });
    jest.mocked(searchTaxonomyCareers).mockImplementation(async (options) => {
      callOrder.push('searchTaxonomyCareers');
      expect(options.query).toBe(mockLearningIntentResponse.condensedAlgoliaQuery);
      return mockTaxonomyHits;
    });

    await generateProfileWorkflow({ answers: mockAnswers, jobIndex: mockJobIndex });

    expect(callOrder).toEqual(['fetchLearningIntent', 'searchTaxonomyCareers']);
  });

  it('passes required and preferred skills to the taxonomy search', async () => {
    await generateProfileWorkflow({ answers: mockAnswers, jobIndex: mockJobIndex });

    expect(searchTaxonomyCareers).toHaveBeenCalledWith(expect.objectContaining({
      skillsRequired: mockLearningIntentResponse.skillsRequired,
      skillsPreferred: mockLearningIntentResponse.skillsPreferred,
    }));
  });

  it('does not call taxonomy search when Learning Intent rejects', async () => {
    jest.mocked(fetchLearningIntent).mockRejectedValueOnce(new Error('network down'));

    await expect(generateProfileWorkflow({ answers: mockAnswers, jobIndex: mockJobIndex }))
      .rejects.toThrow('network down');
    expect(searchTaxonomyCareers).not.toHaveBeenCalled();
  });

  it('throws and does not call taxonomy search when condensedAlgoliaQuery is missing or blank', async () => {
    jest.mocked(fetchLearningIntent).mockResolvedValue({ ...mockLearningIntentResponse, condensedAlgoliaQuery: '   ' });

    await expect(generateProfileWorkflow({ answers: mockAnswers, jobIndex: mockJobIndex }))
      .rejects.toThrow('Learning Intent did not return an Algolia query.');
    expect(searchTaxonomyCareers).not.toHaveBeenCalled();
  });

  it('maps taxonomy hits into CareerMatch[]', async () => {
    const result = await generateProfileWorkflow({ answers: mockAnswers, jobIndex: mockJobIndex });

    expect(result.careerMatches).toEqual([
      { id: 'career-1', title: 'Data Analyst', skillsToDevelop: ['SQL'] },
      { id: 'obj-career-2', title: 'Business Analyst', skillsToDevelop: ['Excel'] },
    ]);
  });

  it('propagates a taxonomy search failure without returning a partial result', async () => {
    jest.mocked(searchTaxonomyCareers).mockRejectedValueOnce(new Error('taxonomy index unavailable'));

    await expect(generateProfileWorkflow({ answers: mockAnswers, jobIndex: mockJobIndex }))
      .rejects.toThrow('taxonomy index unavailable');
  });

  it('returns a real learnerProfile built from intake answers and Learning Intent skills, alongside careerMatches', async () => {
    const result = await generateProfileWorkflow({ answers: mockAnswers, jobIndex: mockJobIndex });

    expect(result.learnerProfile.careerGoal).toBe('Become a data analyst');
    expect(result.learnerProfile.skills).toEqual(['SQL', 'Python', 'Data Visualization']);
    expect(result.learningIntent).toEqual(mockLearningIntentResponse);
  });
});

const mockLearnerProfile = {
  summary: '',
  careerGoal: 'Become a data analyst',
  targetIndustry: 'Financial services',
  background: 'Five years in accounting',
  motivation: 'I want to grow into a data-focused role',
  learningStyle: '',
  weeklyTimeCommitment: '',
  certificatePreference: '',
  skills: ['SQL', 'Python'],
};

const mockSelectedCareer = {
  id: 'data-analyst',
  title: 'Data Analyst',
  skillsToDevelop: ['SQL', 'Tableau'],
};

const mockCourseHits = [
  {
    objectID: 'obj-1', key: 'course-v1:edX+DataX+1T2026', title: 'Intro to Data Analysis', partners: [{ name: 'edX' }],
  },
  {
    objectID: 'obj-2', key: 'course-v1:edX+OtherX+2T2026', title: 'Python for Everyone', partners: [{ name: 'Other Org' }],
  },
];

describe('generatePathwayWorkflow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(searchLearnerPathwaysCourses).mockResolvedValue(mockCourseHits);
    jest.mocked(fetchRecommendationFeedback).mockResolvedValue({
      reasons: {
        'course-v1:edX+DataX+1T2026': 'Matches your target skill in SQL.',
        'course-v1:edX+OtherX+2T2026': 'Matches your target skill in Python.',
      },
    });
  });

  const invoke = (overrides = {}) => generatePathwayWorkflow({
    selectedCareer: mockSelectedCareer,
    learnerProfile: mockLearnerProfile,
    learningIntent: mockLearningIntentResponse,
    visibleSkills: ['SQL', 'Python'],
    catalogIndex: mockCatalogIndex,
    ...overrides,
  });

  it('searches the catalog with the selected career title as the query', async () => {
    await invoke();

    expect(searchLearnerPathwaysCourses).toHaveBeenCalledWith(expect.objectContaining({
      query: 'Data Analyst',
    }));
  });

  it('builds optional skill signals from visibleSkills plus Learning Intent skills, not selectedCareer.skillsToDevelop directly', async () => {
    await invoke({ visibleSkills: ['Tableau Dismissed Test'] });

    const callArgs = jest.mocked(searchLearnerPathwaysCourses).mock.calls[0][0];
    expect(callArgs.optionalSkills).toEqual(
      expect.arrayContaining(['Tableau Dismissed Test', 'SQL', 'Python', 'Data Visualization']),
    );
    // selectedCareer.skillsToDevelop's 'Tableau' must NOT silently override a dismissed visibleSkills list.
    expect(callArgs.optionalSkills).not.toContain('Tableau');
  });

  it('calls course search before Recommendation Feedback', async () => {
    const callOrder: string[] = [];
    jest.mocked(searchLearnerPathwaysCourses).mockImplementation(async () => {
      callOrder.push('searchLearnerPathwaysCourses');
      return mockCourseHits;
    });
    jest.mocked(fetchRecommendationFeedback).mockImplementation(async () => {
      callOrder.push('fetchRecommendationFeedback');
      return { reasons: {} };
    });

    await invoke();

    expect(callOrder).toEqual(['searchLearnerPathwaysCourses', 'fetchRecommendationFeedback']);
  });

  it('preserves Algolia hit order in the returned courses', async () => {
    const result = await invoke();

    expect(result.courses.map((c) => c.courseKey)).toEqual([
      'course-v1:edX+DataX+1T2026',
      'course-v1:edX+OtherX+2T2026',
    ]);
  });

  it('maps hit.key to PathwayCourse.courseKey', async () => {
    const result = await invoke();

    expect(result.courses[0].courseKey).toBe('course-v1:edX+DataX+1T2026');
  });

  it('returns a valid empty result without calling Recommendation Feedback when Algolia returns zero hits', async () => {
    jest.mocked(searchLearnerPathwaysCourses).mockResolvedValue([]);

    const result = await invoke();

    expect(result).toEqual({ courses: [] });
    expect(fetchRecommendationFeedback).not.toHaveBeenCalled();
  });

  it('drops courses missing a stable key, logs each one, and still calls Recommendation Feedback with the remaining valid keys', async () => {
    jest.mocked(searchLearnerPathwaysCourses).mockResolvedValue([
      ...mockCourseHits,
      { objectID: 'obj-3', title: 'Malformed Course' },
    ]);

    const result = await invoke();

    expect(logError).toHaveBeenCalledWith(expect.stringContaining('obj-3'));
    expect(fetchRecommendationFeedback).toHaveBeenCalledWith(expect.objectContaining({
      courseKeys: ['course-v1:edX+DataX+1T2026', 'course-v1:edX+OtherX+2T2026'],
    }));
    expect(result.courses).toHaveLength(2);
  });

  it('throws when every course hit is missing a stable key', async () => {
    jest.mocked(searchLearnerPathwaysCourses).mockResolvedValue([
      { objectID: 'obj-1', title: 'No Key Course' },
    ]);

    await expect(invoke()).rejects.toThrow(
      'All course results are missing a stable catalog key; cannot request Recommendation Feedback.',
    );
    expect(fetchRecommendationFeedback).not.toHaveBeenCalled();
  });

  it('sends the selected career title and course keys in Algolia order to Recommendation Feedback', async () => {
    await invoke();

    expect(fetchRecommendationFeedback).toHaveBeenCalledWith(expect.objectContaining({
      selectedCareer: 'Data Analyst',
      courseKeys: ['course-v1:edX+DataX+1T2026', 'course-v1:edX+OtherX+2T2026'],
    }));
  });

  it('sends a deliberate learner-profile projection to Recommendation Feedback', async () => {
    await invoke();

    const callArgs = jest.mocked(fetchRecommendationFeedback).mock.calls[0][0];
    expect(callArgs.learnerProfile).toEqual({
      careerGoal: 'Become a data analyst',
      targetIndustry: 'Financial services',
      background: 'Five years in accounting',
      motivation: 'I want to grow into a data-focused role',
      skillsRequired: ['SQL', 'Python'],
      skillsPreferred: ['Data Visualization'],
      selectedCareerTitle: 'Data Analyst',
      selectedCareerSkills: ['SQL', 'Tableau'],
    });
  });

  it('calls Recommendation Feedback exactly once', async () => {
    await invoke();

    expect(fetchRecommendationFeedback).toHaveBeenCalledTimes(1);
  });

  it('does not call Recommendation Feedback when Algolia search rejects', async () => {
    jest.mocked(searchLearnerPathwaysCourses).mockRejectedValueOnce(new Error('algolia down'));

    await expect(invoke()).rejects.toThrow('algolia down');
    expect(fetchRecommendationFeedback).not.toHaveBeenCalled();
  });

  it('rejects (does not return a partial result) when Recommendation Feedback rejects', async () => {
    jest.mocked(fetchRecommendationFeedback).mockRejectedValueOnce(new Error('RF unavailable'));

    await expect(invoke()).rejects.toThrow('RF unavailable');
  });

  it('joins reasons by course key, not array position', async () => {
    jest.mocked(fetchRecommendationFeedback).mockResolvedValue({
      reasons: {
        // Deliberately out of Algolia hit order, to prove the join is key-based.
        'course-v1:edX+OtherX+2T2026': 'Reason for course 2',
        'course-v1:edX+DataX+1T2026': 'Reason for course 1',
      },
    });

    const result = await invoke();

    expect(result.courses[0].whyThisFitsYou).toBe('Reason for course 1');
    expect(result.courses[1].whyThisFitsYou).toBe('Reason for course 2');
  });

  it('leaves a missing individual reason undefined without corrupting other courses', async () => {
    jest.mocked(fetchRecommendationFeedback).mockResolvedValue({
      reasons: {
        'course-v1:edX+DataX+1T2026': 'Reason for course 1',
        // course 2's reason intentionally omitted
      },
    });

    const result = await invoke();

    expect(result.courses[0].whyThisFitsYou).toBe('Reason for course 1');
    expect(result.courses[1].whyThisFitsYou).toBeUndefined();
  });

  it('returns enriched courses on a fully successful call', async () => {
    const result = await invoke();

    expect(result.courses).toEqual([
      expect.objectContaining({
        courseKey: 'course-v1:edX+DataX+1T2026',
        whyThisFitsYou: 'Matches your target skill in SQL.',
      }),
      expect.objectContaining({
        courseKey: 'course-v1:edX+OtherX+2T2026',
        whyThisFitsYou: 'Matches your target skill in Python.',
      }),
    ]);
  });
});
