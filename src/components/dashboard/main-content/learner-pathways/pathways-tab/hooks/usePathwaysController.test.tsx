import { act, renderHook } from '@testing-library/react';

import { usePathwaysStore } from '../state';
import {
  generatePathwayWorkflow,
  generateProfileWorkflow,
} from '../workflows';
import { usePathwaysController } from './usePathwaysController';

jest.mock('../workflows', () => ({
  generateProfileWorkflow: jest.fn().mockResolvedValue({ learnerProfile: null, careerMatches: [] }),
  generatePathwayWorkflow: jest.fn().mockResolvedValue(undefined),
}));

const stubProfile = {
  summary: 's',
  careerGoal: 'Data Analyst',
  targetIndustry: 'Tech',
  background: 'Ops',
  motivation: 'Growth',
  learningStyle: 'Hands-on',
  weeklyTimeCommitment: '5 hours',
  certificatePreference: 'Preferred',
  skills: [] as string[],
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
    expect(state.experienceStatus).toBe('onboarding_in_progress');
  });

  it('delegates profile generation to the workflow with the given profile', async () => {
    const { result } = renderHook(() => usePathwaysController());

    await act(async () => {
      await result.current.generateProfile(stubProfile);
    });

    expect(generateProfileWorkflow).toHaveBeenCalledTimes(1);
    expect(generateProfileWorkflow).toHaveBeenCalledWith({ learnerProfile: stubProfile });
  });

  it('delegates pathway generation to workflow placeholder', async () => {
    const { result } = renderHook(() => usePathwaysController());

    await act(async () => {
      await result.current.generatePathway();
    });

    expect(generatePathwayWorkflow).toHaveBeenCalledTimes(1);
  });

  it('resets pathways state via store reset action', () => {
    const { result } = renderHook(() => usePathwaysController());

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
