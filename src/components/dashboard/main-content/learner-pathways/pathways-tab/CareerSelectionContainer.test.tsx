import '@testing-library/jest-dom/extend-expect';
import {
  act, render, screen, waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntlProvider } from '@edx/frontend-platform/i18n';

import CareerSelectionContainer from './CareerSelectionContainer';
import type { CareerSelectionContainerProps } from './CareerSelectionContainer';
import { usePathwaysStore } from './state';
import type { PathwayBaselineSnapshot } from './state';
import {
  CAREER_SELECTION_STUB_MATCHES,
  CAREER_SELECTION_STUB_PROFILE,
} from './career-selection/fixtures';
import { generatePathwayWorkflow, generateProfileWorkflow } from './workflows';
import { PathwaysActionBarProvider } from './action-bar';

jest.mock('./workflows', () => {
  // eslint-disable-next-line global-require
  const { CAREER_SELECTION_STUB_MATCHES: matches } = require('./career-selection/fixtures');
  return {
    generateProfileWorkflow: jest.fn((input) => Promise.resolve({
      learnerProfile: input.learnerProfile,
      careerMatches: matches,
    })),
    generatePathwayWorkflow: jest.fn().mockResolvedValue(undefined),
  };
});

const SELECTED_CAREER_ID = 'reporting-data-analysis-manager';
const OTHER_CAREER_ID = 'business-data-analyst';

const unchangedBaseline: PathwayBaselineSnapshot = {
  careerGoal: CAREER_SELECTION_STUB_PROFILE.careerGoal,
  targetIndustry: CAREER_SELECTION_STUB_PROFILE.targetIndustry,
  background: CAREER_SELECTION_STUB_PROFILE.background,
  motivation: CAREER_SELECTION_STUB_PROFILE.motivation,
  selectedCareerId: SELECTED_CAREER_ID,
};

/** Seeds the store as if a pathway already exists and no relevant edits have occurred. */
const seedExistingUnchangedPathway = () => {
  act(() => {
    usePathwaysStore.setState({
      learnerProfile: { ...CAREER_SELECTION_STUB_PROFILE },
      careerMatches: CAREER_SELECTION_STUB_MATCHES,
      selectedCareerId: SELECTED_CAREER_ID,
      pathwayCourses: [{ id: 'course-1', title: 'Intro to SQL', status: 'not_started' }],
      pathwayBaseline: { ...unchangedBaseline },
    });
  });
};

const renderContainer = (props: Partial<CareerSelectionContainerProps> = {}) => render(
  <IntlProvider locale="en">
    <PathwaysActionBarProvider>
      <CareerSelectionContainer {...props} />
    </PathwaysActionBarProvider>
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
    jest.mocked(generateProfileWorkflow).mockImplementation((input) => Promise.resolve({
      learnerProfile: input.learnerProfile,
      careerMatches: CAREER_SELECTION_STUB_MATCHES,
    }));
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

  it('syncs the corresponding persisted Intake answer when a Goal Summary edit succeeds', async () => {
    const user = userEvent.setup();
    renderContainer();

    await submitGoalSummaryEdit(user, 'Director of Analytics');

    await waitFor(() => {
      expect(usePathwaysStore.getState().onboarding.answers.goal).toBe('Director of Analytics');
    });
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

  describe('State A — no existing pathway', () => {
    it('renders only the build action, no retake-quiz-adjacent trailing actions', () => {
      renderContainer();
      expect(screen.getByTestId('career-build-pathway-button')).toHaveTextContent('Build my learning pathway');
      expect(screen.queryByTestId('career-view-current-pathway-button')).not.toBeInTheDocument();
      expect(screen.queryByTestId('career-rebuild-pathway-button')).not.toBeInTheDocument();
    });

    it('calls onNext and marks the pathway ready when generatePathway resolves', async () => {
      const user = userEvent.setup();
      const onNext = jest.fn();
      renderContainer({ onNext });

      await user.click(screen.getByTestId('career-build-pathway-button'));

      await waitFor(() => expect(onNext).toHaveBeenCalledTimes(1));
      expect(generatePathwayWorkflow).toHaveBeenCalledTimes(1);
      expect(usePathwaysStore.getState().experienceStatus).toBe('pathway_ready');
      expect(usePathwaysStore.getState().selectedCareerId).toBe(SELECTED_CAREER_ID);
      expect(usePathwaysStore.getState().pathwayBaseline).toEqual(unchangedBaseline);
    });

    it('does not fall back to profile skills when the selected career has an empty skillsToDevelop array', () => {
      act(() => {
        usePathwaysStore.setState({
          learnerProfile: { ...CAREER_SELECTION_STUB_PROFILE, skills: ['Fallback Skill'] },
          careerMatches: [
            {
              id: 'no-skills', title: 'No Skills Role', matchPercentage: 90, skillsToDevelop: [],
            },
          ],
          selectedCareerId: 'no-skills',
        });
      });
      renderContainer();

      expect(screen.getByTestId('skills-empty-state')).toBeInTheDocument();
      expect(screen.queryByText('Fallback Skill')).not.toBeInTheDocument();
    });

    it('sets a fallback pathway error without surfacing it in the UI when generatePathway rejects', async () => {
      const user = userEvent.setup();
      jest.mocked(generatePathwayWorkflow).mockRejectedValueOnce('boom');
      const onNext = jest.fn();
      renderContainer({ onNext });

      await user.click(screen.getByTestId('career-build-pathway-button'));

      await waitFor(() => {
        expect(usePathwaysStore.getState().errors.pathwayCourses).toBe('Unable to build the learning pathway.');
      });
      expect(onNext).not.toHaveBeenCalled();
      expect(screen.queryByText('Unable to build the learning pathway.')).not.toBeInTheDocument();
      expect(screen.getByTestId('career-build-pathway-button')).not.toBeDisabled();
      // Recovers: the pathway was never built, so the baseline stays unset.
      expect(usePathwaysStore.getState().pathwayBaseline).toBeNull();
    });

    it('shows the loading state and cannot issue duplicate builds from a double click', async () => {
      const user = userEvent.setup();
      let resolveWorkflow: () => void = () => {};
      jest.mocked(generatePathwayWorkflow).mockImplementationOnce(() => new Promise((resolve) => {
        resolveWorkflow = () => resolve(undefined);
      }));
      renderContainer();

      const button = screen.getByTestId('career-build-pathway-button');
      await user.click(button);
      await user.click(button);

      expect(screen.getByTestId('career-build-pathway-button')).toHaveTextContent('Building pathway...');
      expect(screen.getByTestId('career-build-pathway-button')).toBeDisabled();
      expect(generatePathwayWorkflow).toHaveBeenCalledTimes(1);

      await act(async () => {
        resolveWorkflow();
        await Promise.resolve();
      });
    });
  });

  describe('State B — existing pathway, no relevant edits', () => {
    it('renders only the (unchanged-label) build action', () => {
      seedExistingUnchangedPathway();
      renderContainer();

      expect(screen.getByTestId('career-build-pathway-button')).toHaveTextContent('Build my learning pathway');
      expect(screen.queryByTestId('career-view-current-pathway-button')).not.toBeInTheDocument();
      expect(screen.queryByTestId('career-rebuild-pathway-button')).not.toBeInTheDocument();
    });

    it('navigates without rebuilding when the build action is clicked', async () => {
      const user = userEvent.setup();
      const onNext = jest.fn();
      seedExistingUnchangedPathway();
      renderContainer({ onNext });

      await user.click(screen.getByTestId('career-build-pathway-button'));

      expect(onNext).toHaveBeenCalledTimes(1);
      expect(generatePathwayWorkflow).not.toHaveBeenCalled();
    });

    it('does not open the rebuild modal when the build action is clicked', async () => {
      const user = userEvent.setup();
      seedExistingUnchangedPathway();
      renderContainer();

      await user.click(screen.getByTestId('career-build-pathway-button'));

      expect(screen.queryByText('Rebuild your pathway?')).not.toBeInTheDocument();
    });
  });

  describe('State C — existing pathway, relevant edits made', () => {
    it('shows View current pathway + Rebuild after a successful Goal Summary edit', async () => {
      const user = userEvent.setup();
      seedExistingUnchangedPathway();
      renderContainer();

      await submitGoalSummaryEdit(user, 'Director of Analytics');

      await waitFor(() => {
        expect(screen.getByTestId('career-view-current-pathway-button')).toBeInTheDocument();
      });
      expect(screen.getByTestId('career-rebuild-pathway-button')).toHaveTextContent('Rebuild my learning pathway');
      expect(screen.queryByTestId('career-build-pathway-button')).not.toBeInTheDocument();
    });

    it('shows View current pathway + Rebuild after selecting a different career', async () => {
      const user = userEvent.setup();
      seedExistingUnchangedPathway();
      renderContainer();

      await user.click(screen.getByTestId(`career-match-${OTHER_CAREER_ID}`));

      expect(screen.getByTestId('career-view-current-pathway-button')).toBeInTheDocument();
      expect(screen.getByTestId('career-rebuild-pathway-button')).toBeInTheDocument();
    });

    it('View current pathway navigates without rebuilding', async () => {
      const user = userEvent.setup();
      const onNext = jest.fn();
      seedExistingUnchangedPathway();
      renderContainer({ onNext });
      await submitGoalSummaryEdit(user, 'Director of Analytics');
      await waitFor(() => screen.getByTestId('career-view-current-pathway-button'));

      await user.click(screen.getByTestId('career-view-current-pathway-button'));

      expect(onNext).toHaveBeenCalledTimes(1);
      expect(generatePathwayWorkflow).not.toHaveBeenCalled();
    });

    it('Rebuild opens the confirmation modal without rebuilding immediately', async () => {
      const user = userEvent.setup();
      seedExistingUnchangedPathway();
      renderContainer();
      await submitGoalSummaryEdit(user, 'Director of Analytics');
      await waitFor(() => screen.getByTestId('career-rebuild-pathway-button'));

      await user.click(screen.getByTestId('career-rebuild-pathway-button'));

      expect(screen.getByText('Rebuild your pathway?')).toBeInTheDocument();
      expect(generatePathwayWorkflow).not.toHaveBeenCalled();
    });

    it('confirming the rebuild modal rebuilds once, resets the baseline, and navigates', async () => {
      const user = userEvent.setup();
      const onNext = jest.fn();
      seedExistingUnchangedPathway();
      renderContainer({ onNext });
      await submitGoalSummaryEdit(user, 'Director of Analytics');
      await waitFor(() => screen.getByTestId('career-rebuild-pathway-button'));
      await user.click(screen.getByTestId('career-rebuild-pathway-button'));

      await user.click(screen.getByRole('button', { name: 'Rebuild my learning pathway' }));

      await waitFor(() => expect(onNext).toHaveBeenCalledTimes(1));
      expect(generatePathwayWorkflow).toHaveBeenCalledTimes(1);
      expect(usePathwaysStore.getState().pathwayBaseline?.careerGoal).toBe('Director of Analytics');
    });

    it('canceling the rebuild modal does not rebuild', async () => {
      const user = userEvent.setup();
      seedExistingUnchangedPathway();
      renderContainer();
      await submitGoalSummaryEdit(user, 'Director of Analytics');
      await waitFor(() => screen.getByTestId('career-rebuild-pathway-button'));
      await user.click(screen.getByTestId('career-rebuild-pathway-button'));

      await user.click(screen.getByRole('button', { name: 'Keep previous pathway' }));

      expect(generatePathwayWorkflow).not.toHaveBeenCalled();
      expect(screen.queryByText('Rebuild your pathway?')).not.toBeInTheDocument();
    });
  });

  describe('non-edits do not mark the pathway dirty', () => {
    it('opening and canceling Goal Summary edit mode', async () => {
      const user = userEvent.setup();
      seedExistingUnchangedPathway();
      renderContainer();

      await user.click(screen.getByTestId('goal-summary-edit-button'));
      await user.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(screen.getByTestId('career-build-pathway-button')).toBeInTheDocument();
      expect(screen.queryByTestId('career-view-current-pathway-button')).not.toBeInTheDocument();
    });

    it('a failed Goal Summary submission', async () => {
      const user = userEvent.setup();
      jest.mocked(generateProfileWorkflow).mockRejectedValueOnce(new Error('network down'));
      seedExistingUnchangedPathway();
      renderContainer();

      await submitGoalSummaryEdit(user, 'Director of Analytics');

      await waitFor(() => expect(screen.getByText('network down')).toBeInTheDocument());
      expect(screen.getByTestId('career-build-pathway-button')).toBeInTheDocument();
      expect(screen.queryByTestId('career-view-current-pathway-button')).not.toBeInTheDocument();
    });

    it('selecting the already-selected career', async () => {
      const user = userEvent.setup();
      seedExistingUnchangedPathway();
      renderContainer();

      await user.click(screen.getByTestId(`career-match-${SELECTED_CAREER_ID}`));

      expect(screen.getByTestId('career-build-pathway-button')).toBeInTheDocument();
      expect(screen.queryByTestId('career-view-current-pathway-button')).not.toBeInTheDocument();
    });
  });

  describe('skills persist in the store, not component state', () => {
    it('dismissing a skill updates the persisted dismissedSkillKeys', async () => {
      const user = userEvent.setup();
      renderContainer();

      await user.click(screen.getByLabelText('Dismiss SQL'));

      expect(usePathwaysStore.getState().dismissedSkillKeys).toContain('SQL');
      expect(screen.queryByText('SQL')).not.toBeInTheDocument();
    });

    it('dismissed skills survive unmounting and remounting the container', async () => {
      const user = userEvent.setup();
      const { unmount } = renderContainer();

      await user.click(screen.getByLabelText('Dismiss SQL'));
      unmount();

      renderContainer();

      expect(screen.queryByText('SQL')).not.toBeInTheDocument();
    });

    it('restoring skills clears the persisted dismissedSkillKeys', async () => {
      const user = userEvent.setup();
      renderContainer();

      await user.click(screen.getByLabelText('Dismiss SQL'));
      await user.click(screen.getByRole('button', { name: 'Restore skills' }));

      expect(usePathwaysStore.getState().dismissedSkillKeys).toEqual([]);
      expect(screen.getByText('SQL')).toBeInTheDocument();
    });

    it('selecting a different career resets dismissed skills, but reselecting the same one does not', async () => {
      const user = userEvent.setup();
      seedExistingUnchangedPathway();
      renderContainer();

      await user.click(screen.getByLabelText('Dismiss SQL'));
      await user.click(screen.getByTestId(`career-match-${SELECTED_CAREER_ID}`));
      expect(usePathwaysStore.getState().dismissedSkillKeys).toContain('SQL');

      await user.click(screen.getByTestId(`career-match-${OTHER_CAREER_ID}`));
      expect(usePathwaysStore.getState().dismissedSkillKeys).toEqual([]);
    });
  });

  describe('lifecycle', () => {
    it('dirty state survives unmounting and remounting the container', async () => {
      const user = userEvent.setup();
      seedExistingUnchangedPathway();
      const { unmount } = renderContainer();
      await submitGoalSummaryEdit(user, 'Director of Analytics');
      await waitFor(() => screen.getByTestId('career-rebuild-pathway-button'));

      unmount();
      renderContainer();

      expect(screen.getByTestId('career-view-current-pathway-button')).toBeInTheDocument();
      expect(screen.getByTestId('career-rebuild-pathway-button')).toBeInTheDocument();
    });

    it('a successful rebuild resets the baseline back to the unchanged state', async () => {
      const user = userEvent.setup();
      seedExistingUnchangedPathway();
      renderContainer();
      await submitGoalSummaryEdit(user, 'Director of Analytics');
      await waitFor(() => screen.getByTestId('career-rebuild-pathway-button'));
      await user.click(screen.getByTestId('career-rebuild-pathway-button'));
      await user.click(screen.getByRole('button', { name: 'Rebuild my learning pathway' }));

      await waitFor(() => {
        expect(screen.getByTestId('career-build-pathway-button')).toBeInTheDocument();
      });
      expect(screen.queryByTestId('career-view-current-pathway-button')).not.toBeInTheDocument();
      expect(screen.queryByTestId('career-rebuild-pathway-button')).not.toBeInTheDocument();
    });

    it('seeds a baseline (assumed unchanged) when an existing pathway is loaded with no baseline recorded', () => {
      act(() => {
        usePathwaysStore.setState({
          learnerProfile: { ...CAREER_SELECTION_STUB_PROFILE },
          careerMatches: CAREER_SELECTION_STUB_MATCHES,
          selectedCareerId: SELECTED_CAREER_ID,
          pathwayCourses: [{ id: 'course-1', title: 'Intro to SQL', status: 'not_started' }],
          pathwayBaseline: null,
        });
      });
      renderContainer();

      expect(screen.getByTestId('career-build-pathway-button')).toBeInTheDocument();
      expect(usePathwaysStore.getState().pathwayBaseline).toEqual(unchangedBaseline);
    });
  });

  describe('Retake quiz', () => {
    it('opens the warning modal', async () => {
      const user = userEvent.setup();
      renderContainer();

      await user.click(screen.getByTestId('career-retake-quiz-button'));

      expect(screen.getByText('Retake your onboarding quiz?')).toBeInTheDocument();
    });

    it('cancel closes the modal without navigating', async () => {
      const user = userEvent.setup();
      const onRetakeQuiz = jest.fn();
      renderContainer({ onRetakeQuiz });

      await user.click(screen.getByTestId('career-retake-quiz-button'));
      await user.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(onRetakeQuiz).not.toHaveBeenCalled();
      expect(screen.queryByText('Retake your onboarding quiz?')).not.toBeInTheDocument();
    });

    it('confirm invokes onRetakeQuiz', async () => {
      const user = userEvent.setup();
      const onRetakeQuiz = jest.fn();
      renderContainer({ onRetakeQuiz });

      await user.click(screen.getByTestId('career-retake-quiz-button'));
      await user.click(screen.getByRole('button', { name: 'Retake quiz' }));

      expect(onRetakeQuiz).toHaveBeenCalledTimes(1);
    });

    it('does not clear the existing saved pathway when confirming retake', async () => {
      const user = userEvent.setup();
      const onRetakeQuiz = jest.fn();
      seedExistingUnchangedPathway();
      renderContainer({ onRetakeQuiz });

      await user.click(screen.getByTestId('career-retake-quiz-button'));
      await user.click(screen.getByRole('button', { name: 'Retake quiz' }));

      expect(usePathwaysStore.getState().pathwayCourses).not.toEqual([]);
      expect(usePathwaysStore.getState().pathwayBaseline).toEqual(unchangedBaseline);
      expect(usePathwaysStore.getState().learnerProfile).not.toBeNull();
    });

    it('returns focus to the trigger after the modal closes', async () => {
      const user = userEvent.setup();
      renderContainer();

      await user.click(screen.getByTestId('career-retake-quiz-button'));
      await user.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(screen.getByTestId('career-retake-quiz-button')).toHaveFocus();
    });
  });
});
