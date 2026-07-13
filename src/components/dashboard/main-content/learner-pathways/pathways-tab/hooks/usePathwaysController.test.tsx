import { act, renderHook } from '@testing-library/react';

import { usePathwaysStore } from '../state';
import {
  generatePathwayWorkflow,
  generateProfileWorkflow,
} from '../workflows';
import { usePathwaysController } from './usePathwaysController';

jest.mock('../workflows', () => ({
  generateProfileWorkflow: jest.fn(),
  generatePathwayWorkflow: jest.fn(),
}));

const mockJobIndex = {} as Parameters<typeof usePathwaysController>[0]['jobIndex'];
const mockCatalogIndex = {} as Parameters<typeof usePathwaysController>[0]['catalogIndex'];

const mockAnswers = {
  motivation: 'Motivation', goal: 'Goal', background: 'Background', industry: 'Industry',
};

const mockLearningIntent = {
  skillsRequired: ['SQL'],
  skillsPreferred: ['Python'],
  condensedAlgoliaQuery: 'sql python',
};

const mockLearnerProfile = {
  summary: '',
  careerGoal: 'Goal',
  targetIndustry: 'Industry',
  background: 'Background',
  motivation: 'Motivation',
  learningStyle: '',
  weeklyTimeCommitment: '',
  certificatePreference: '',
  skills: ['SQL', 'Python'],
};

const mockCareerMatches = [
  { id: 'career-1', title: 'Data Analyst', skillsToDevelop: ['SQL'] },
  { id: 'career-2', title: 'Business Analyst', skillsToDevelop: ['Excel'] },
];

const mockGeneratePathwayInput = {
  selectedCareer: mockCareerMatches[0],
  learnerProfile: mockLearnerProfile,
  learningIntent: mockLearningIntent,
  visibleSkills: ['SQL'],
};

const renderController = () => renderHook(() => usePathwaysController({
  jobIndex: mockJobIndex,
  catalogIndex: mockCatalogIndex,
}));

describe('usePathwaysController', () => {
  beforeEach(() => {
    usePathwaysStore.getState().resetPathwaysState();
    jest.clearAllMocks();
    jest.mocked(generateProfileWorkflow).mockResolvedValue({
      learningIntent: mockLearningIntent,
      learnerProfile: mockLearnerProfile,
      careerMatches: mockCareerMatches,
    });
    jest.mocked(generatePathwayWorkflow).mockResolvedValue({ courses: [] });
  });

  it('transitions onboarding state when startOnboarding is called', () => {
    const { result } = renderController();

    act(() => {
      result.current.startOnboarding();
    });

    const state = usePathwaysStore.getState();
    expect(state.section).toBe('onboarding');
    expect(state.experienceStatus).toBe('onboarding_in_progress');
  });

  describe('generateProfile', () => {
    it('delegates to the workflow with explicit answers and the job index', async () => {
      const { result } = renderController();

      await act(async () => {
        await result.current.generateProfile(mockAnswers);
      });

      expect(generateProfileWorkflow).toHaveBeenCalledTimes(1);
      expect(generateProfileWorkflow).toHaveBeenCalledWith({ answers: mockAnswers, jobIndex: mockJobIndex });
    });

    it('commits learningIntent, learnerProfile, and careerMatches, auto-selects the first career, and navigates to profile', async () => {
      const { result } = renderController();

      await act(async () => {
        await result.current.generateProfile(mockAnswers);
      });

      const state = usePathwaysStore.getState();
      expect(state.learningIntent).toEqual(mockLearningIntent);
      expect(state.learnerProfile).toEqual(mockLearnerProfile);
      expect(state.careerMatches).toEqual(mockCareerMatches);
      expect(state.selectedCareerId).toBe('career-1');
      expect(state.experienceStatus).toBe('profile_ready');
      expect(state.section).toBe('profile');
    });

    it('does not auto-select a career when careerMatches is empty', async () => {
      jest.mocked(generateProfileWorkflow).mockResolvedValue({
        learningIntent: mockLearningIntent,
        learnerProfile: mockLearnerProfile,
        careerMatches: [],
      });
      const { result } = renderController();

      await act(async () => {
        await result.current.generateProfile(mockAnswers);
      });

      expect(usePathwaysStore.getState().selectedCareerId).toBeNull();
    });

    it('clears the learnerProfile/careerMatches loading flags and error after a successful call', async () => {
      const { result } = renderController();

      await act(async () => {
        await result.current.generateProfile(mockAnswers);
      });

      const state = usePathwaysStore.getState();
      expect(state.loading.learnerProfile).toBe(false);
      expect(state.loading.careerMatches).toBe(false);
      expect(state.errors.learnerProfile).toBeNull();
    });

    it('records the error, clears loading, rethrows, and does not navigate when the workflow rejects', async () => {
      jest.mocked(generateProfileWorkflow).mockRejectedValueOnce(new Error('network down'));
      const { result } = renderController();

      await expect(act(async () => {
        await result.current.generateProfile(mockAnswers);
      })).rejects.toThrow('network down');

      const state = usePathwaysStore.getState();
      expect(state.loading.learnerProfile).toBe(false);
      expect(state.errors.learnerProfile).toBe('network down');
      expect(state.section).toBe('onboarding');
    });

    it('sets a clear error and does not call the workflow when jobIndex is null', async () => {
      const { result } = renderHook(() => usePathwaysController({ jobIndex: null, catalogIndex: mockCatalogIndex }));

      await expect(act(async () => {
        await result.current.generateProfile(mockAnswers);
      })).rejects.toThrow('Taxonomy career search is not configured.');

      expect(generateProfileWorkflow).not.toHaveBeenCalled();
      expect(usePathwaysStore.getState().errors.learnerProfile).toBe('Taxonomy career search is not configured.');
    });
  });

  describe('generatePathway', () => {
    it('delegates to the workflow with explicit input and the catalog index', async () => {
      const { result } = renderController();

      await act(async () => {
        await result.current.generatePathway(mockGeneratePathwayInput);
      });

      expect(generatePathwayWorkflow).toHaveBeenCalledTimes(1);
      expect(generatePathwayWorkflow).toHaveBeenCalledWith({
        ...mockGeneratePathwayInput,
        catalogIndex: mockCatalogIndex,
      });
    });

    it('commits pathwayCourses and navigates to the pathway section on success', async () => {
      const mockCourses = [{
        id: 'obj-1', courseKey: 'course-v1:edX+DataX+1T2026', title: 'Intro to Data', status: 'not_started' as const,
      }];
      jest.mocked(generatePathwayWorkflow).mockResolvedValue({ courses: mockCourses });
      const { result } = renderController();

      await act(async () => {
        await result.current.generatePathway(mockGeneratePathwayInput);
      });

      const state = usePathwaysStore.getState();
      expect(state.pathwayCourses).toEqual(mockCourses);
      expect(state.experienceStatus).toBe('pathway_ready');
      expect(state.section).toBe('pathway');
    });

    it('clears the pathwayCourses loading flag and error after a successful call', async () => {
      const { result } = renderController();

      await act(async () => {
        await result.current.generatePathway(mockGeneratePathwayInput);
      });

      const state = usePathwaysStore.getState();
      expect(state.loading.pathwayCourses).toBe(false);
      expect(state.errors.pathwayCourses).toBeNull();
    });

    it('records the error, clears loading, rethrows, and does not navigate when the workflow rejects', async () => {
      jest.mocked(generatePathwayWorkflow).mockRejectedValueOnce(new Error('Unable to build the learning pathway.'));
      const { result } = renderController();

      await expect(act(async () => {
        await result.current.generatePathway(mockGeneratePathwayInput);
      })).rejects.toThrow('Unable to build the learning pathway.');

      const state = usePathwaysStore.getState();
      expect(state.loading.pathwayCourses).toBe(false);
      expect(state.errors.pathwayCourses).toBe('Unable to build the learning pathway.');
      expect(state.section).not.toBe('pathway');
    });

    it('sets a clear error and does not call the workflow when catalogIndex is null', async () => {
      const { result } = renderHook(() => usePathwaysController({ jobIndex: mockJobIndex, catalogIndex: null }));

      await expect(act(async () => {
        await result.current.generatePathway(mockGeneratePathwayInput);
      })).rejects.toThrow('Course catalog search is not configured.');

      expect(generatePathwayWorkflow).not.toHaveBeenCalled();
      expect(usePathwaysStore.getState().errors.pathwayCourses).toBe('Course catalog search is not configured.');
    });
  });

  it('resets pathways state via store reset action', () => {
    const { result } = renderController();

    act(() => {
      usePathwaysStore.getState().setSection('pathway');
      usePathwaysStore.getState().setExperienceStatus('pathway_ready');
      result.current.resetPathway();
    });

    const state = usePathwaysStore.getState();
    expect(state.section).toBe('onboarding');
    expect(state.experienceStatus).toBe('not_started');
  });
});
