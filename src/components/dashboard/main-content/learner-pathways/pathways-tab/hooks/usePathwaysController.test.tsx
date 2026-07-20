import { act, renderHook } from '@testing-library/react';

import { usePathwaysStore } from '../state';
import {
  generatePathwayWorkflow,
  generateProfileWorkflow,
} from '../workflows';
import { usePathwaysController } from './usePathwaysController';

jest.mock('../workflows', () => ({
  generateProfileWorkflow: jest.fn().mockResolvedValue({ learnerProfile: null, careerMatches: [] }),
  generatePathwayWorkflow: jest.fn().mockResolvedValue({ courses: [] }),
}));

jest.mock('../../../../../app/data/hooks', () => ({
  useSearchCatalogs: jest.fn(() => ['cat-1']),
  useAlgoliaSearch: jest.fn(() => ({ catalogUuidsToCatalogQueryUuids: { 'cat-1': 'query-1' } })),
}));

const stubLearnerIntent = {
  careerGoal: 'Data Analyst', targetIndustry: 'Tech', background: 'Ops', motivation: 'Growth',
};

const stubRequest = {
  learnerIntent: stubLearnerIntent,
  learnerProfile: {
    summary: 's', learningStyle: 'Hands-on', weeklyTimeCommitment: '5 hours', certificatePreference: 'Preferred', skills: [] as string[],
  },
  selectedCareerId: 'career-1',
  selectedSkills: ['SQL'],
};

const stubSelectedCareer = { id: 'career-1', title: 'Data Analyst', skillsToDevelop: ['SQL'] };

describe('usePathwaysController', () => {
  beforeEach(() => {
    usePathwaysStore.getState().resetPathwaysState();
    jest.clearAllMocks();
  });

  it('transitions onboarding state when startOnboarding is called', () => {
    const { result } = renderHook(() => usePathwaysController());

    act(() => {
      result.current.startOnboarding();
    });

    const state = usePathwaysStore.getState();
    expect(state.section).toBe('onboarding');
  });

  it('delegates profile generation to the workflow with the given learner intent', async () => {
    const { result } = renderHook(() => usePathwaysController());

    await act(async () => {
      await result.current.generateProfile(stubLearnerIntent);
    });

    expect(generateProfileWorkflow).toHaveBeenCalledTimes(1);
    expect(generateProfileWorkflow).toHaveBeenCalledWith(stubLearnerIntent);
  });

  it('delegates pathway generation to the workflow with the explicit request, selected career, and resolved catalog scope', async () => {
    const { result } = renderHook(() => usePathwaysController());

    await act(async () => {
      await result.current.generatePathway(stubRequest, stubSelectedCareer);
    });

    expect(generatePathwayWorkflow).toHaveBeenCalledTimes(1);
    expect(generatePathwayWorkflow).toHaveBeenCalledWith({
      request: stubRequest,
      selectedCareer: stubSelectedCareer,
      catalogScope: {
        searchCatalogs: ['cat-1'],
        catalogUuidsToCatalogQueryUuids: { 'cat-1': 'query-1' },
      },
    });
  });

  it('is a pure delegate for pathway generation: a workflow rejection propagates untouched with no store side effect', async () => {
    const workflowError = new Error('Algolia service unavailable');
    jest.mocked(generatePathwayWorkflow).mockRejectedValueOnce(workflowError);
    const { result } = renderHook(() => usePathwaysController());

    await expect(
      act(async () => {
        await result.current.generatePathway(stubRequest, stubSelectedCareer);
      }),
    ).rejects.toThrow(workflowError);

    const state = usePathwaysStore.getState();
    expect(state.pathwayCourses).toEqual([]);
    expect(state.pathwayInputFingerprint).toBeNull();
  });

  it('resets pathways state via store reset action', () => {
    const { result } = renderHook(() => usePathwaysController());

    act(() => {
      usePathwaysStore.getState().setSection('pathway');
      result.current.resetPathway();
    });

    const state = usePathwaysStore.getState();
    expect(state.section).toBe('onboarding');
  });
});
