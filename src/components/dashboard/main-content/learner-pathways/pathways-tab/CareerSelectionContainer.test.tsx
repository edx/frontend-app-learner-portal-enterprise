import '@testing-library/jest-dom/extend-expect';
import {
  act, render, screen, waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntlProvider } from '@edx/frontend-platform/i18n';

import CareerSelectionContainer from './CareerSelectionContainer';
import type { CareerSelectionContainerProps } from './CareerSelectionContainer';
import { usePathwaysStore } from './state';
import {
  CAREER_SELECTION_STUB_MATCHES,
  CAREER_SELECTION_STUB_PROFILE,
} from './career-selection/fixtures';
import { generatePathwayWorkflow, generateProfileWorkflow } from './workflows';

jest.mock('./workflows', () => ({
  generateProfileWorkflow: jest.fn().mockResolvedValue(undefined),
  generatePathwayWorkflow: jest.fn().mockResolvedValue(undefined),
}));

const renderContainer = (props: Partial<CareerSelectionContainerProps> = {}) => render(
  <IntlProvider locale="en">
    <CareerSelectionContainer {...props} />
  </IntlProvider>,
);

const submitGoalSummaryEdit = async (
  user: ReturnType<typeof userEvent.setup>,
  careerGoal: string,
) => {
  await user.click(screen.getByTestId('goal-summary-edit-button'));
  const careerGoalField = screen.getByLabelText('Career Goal');
  await user.clear(careerGoalField);
  await user.type(careerGoalField, careerGoal);
  await user.click(screen.getByTestId('goal-summary-submit-button'));
};

describe('CareerSelectionContainer', () => {
  beforeEach(() => {
    usePathwaysStore.getState().resetPathwaysState();
    jest.clearAllMocks();
    jest.mocked(generateProfileWorkflow).mockResolvedValue(undefined);
    jest.mocked(generatePathwayWorkflow).mockResolvedValue(undefined);
  });

  it('hydrates the learner profile and stub career matches on first goal-summary submission', async () => {
    const user = userEvent.setup();
    renderContainer();

    await submitGoalSummaryEdit(user, 'Director of Analytics');

    await waitFor(() => {
      expect(usePathwaysStore.getState().learnerProfile?.careerGoal).toBe('Director of Analytics');
    });
    expect(usePathwaysStore.getState().experienceStatus).toBe('profile_ready');
    expect(usePathwaysStore.getState().careerMatches).toEqual(CAREER_SELECTION_STUB_MATCHES);
  });

  it('preserves existing profile fields when updating an already-set learner profile', async () => {
    const user = userEvent.setup();
    act(() => {
      usePathwaysStore.setState({
        learnerProfile: { ...CAREER_SELECTION_STUB_PROFILE },
        careerMatches: CAREER_SELECTION_STUB_MATCHES,
      });
    });
    renderContainer();

    await submitGoalSummaryEdit(user, 'Director of Analytics');

    await waitFor(() => {
      expect(usePathwaysStore.getState().learnerProfile?.careerGoal).toBe('Director of Analytics');
    });
    expect(usePathwaysStore.getState().learnerProfile?.skills).toEqual(CAREER_SELECTION_STUB_PROFILE.skills);
  });

  it('surfaces a profile error and does not advance the experience status when generateProfile rejects', async () => {
    const user = userEvent.setup();
    jest.mocked(generateProfileWorkflow).mockRejectedValueOnce(new Error('network down'));
    renderContainer();

    await submitGoalSummaryEdit(user, 'Director of Analytics');

    await waitFor(() => {
      expect(screen.getByText('network down')).toBeInTheDocument();
    });
    expect(usePathwaysStore.getState().errors.learnerProfile).toBe('network down');
    expect(usePathwaysStore.getState().experienceStatus).not.toBe('profile_ready');
  });

  it('calls onNext and marks the pathway ready when generatePathway resolves', async () => {
    const user = userEvent.setup();
    const onNext = jest.fn();
    renderContainer({ onNext });

    await user.click(screen.getByTestId('profile-build-pathway-button'));

    await waitFor(() => expect(onNext).toHaveBeenCalledTimes(1));
    expect(usePathwaysStore.getState().experienceStatus).toBe('pathway_ready');
    expect(usePathwaysStore.getState().selectedCareerId).toBe('reporting-data-analysis-manager');
  });

  it('sets a fallback pathway error without surfacing it in the UI when generatePathway rejects', async () => {
    const user = userEvent.setup();
    jest.mocked(generatePathwayWorkflow).mockRejectedValueOnce('boom');
    const onNext = jest.fn();
    renderContainer({ onNext });

    await user.click(screen.getByTestId('profile-build-pathway-button'));

    await waitFor(() => {
      expect(usePathwaysStore.getState().errors.pathwayCourses).toBe('Unable to build the learning pathway.');
    });
    expect(onNext).not.toHaveBeenCalled();
    expect(screen.queryByText('Unable to build the learning pathway.')).not.toBeInTheDocument();
    expect(screen.getByTestId('profile-build-pathway-button')).not.toBeDisabled();
  });
});
