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

  it('delegates pathway generation to the workflow with the explicit request', async () => {
    const { result } = renderHook(() => usePathwaysController());

    await act(async () => {
      await result.current.generatePathway(stubRequest);
    });

    expect(generatePathwayWorkflow).toHaveBeenCalledTimes(1);
    expect(generatePathwayWorkflow).toHaveBeenCalledWith(stubRequest);
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
