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
import { PathwaysActionBarProvider } from './action-bar';

jest.mock('./workflows', () => ({
  generateProfileWorkflow: jest.fn(),
  generatePathwayWorkflow: jest.fn().mockResolvedValue({ courses: [] }),
}));

const mockJobIndex = {} as CareerSelectionContainerProps['jobIndex'];
const mockCatalogIndex = {} as CareerSelectionContainerProps['catalogIndex'];

const mockEditedProfileWorkflowResult = {
  learningIntent: { skillsRequired: ['SQL'], skillsPreferred: [], condensedAlgoliaQuery: 'sql' },
  learnerProfile: {
    summary: '',
    careerGoal: 'Director of Analytics',
    targetIndustry: CAREER_SELECTION_STUB_PROFILE.targetIndustry,
    background: CAREER_SELECTION_STUB_PROFILE.background,
    motivation: CAREER_SELECTION_STUB_PROFILE.motivation,
    learningStyle: '',
    weeklyTimeCommitment: '',
    certificatePreference: '',
    skills: ['SQL'],
  },
  careerMatches: [
    { id: 'director-of-analytics', title: 'Director of Analytics', skillsToDevelop: ['SQL'] },
  ],
};

const renderContainer = (props: Partial<CareerSelectionContainerProps> = {}) => render(
  <IntlProvider locale="en">
    <PathwaysActionBarProvider>
      <CareerSelectionContainer jobIndex={mockJobIndex} catalogIndex={mockCatalogIndex} {...props} />
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
    jest.mocked(generateProfileWorkflow).mockResolvedValue(mockEditedProfileWorkflowResult);
    jest.mocked(generatePathwayWorkflow).mockResolvedValue({ courses: [] });
  });

  it('sends the edited goal-summary fields, mapped to the Learning Intent request shape, to the profile workflow', async () => {
    const user = userEvent.setup();
    renderContainer();

    await submitGoalSummaryEdit(user, 'Director of Analytics');

    await waitFor(() => {
      expect(generateProfileWorkflow).toHaveBeenCalledWith({
        answers: expect.objectContaining({ goal: 'Director of Analytics' }),
        jobIndex: mockJobIndex,
      });
    });
  });

  it('hydrates the learner profile and career matches from the Learning Intent workflow result on submission', async () => {
    const user = userEvent.setup();
    renderContainer();

    await submitGoalSummaryEdit(user, 'Director of Analytics');

    await waitFor(() => {
      expect(usePathwaysStore.getState().learnerProfile?.careerGoal).toBe('Director of Analytics');
    });
    expect(usePathwaysStore.getState().experienceStatus).toBe('profile_ready');
    expect(usePathwaysStore.getState().careerMatches).toEqual(mockEditedProfileWorkflowResult.careerMatches);
  });

  it('sends the edit and updates the profile again when editing an already-set learner profile', async () => {
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
    expect(generateProfileWorkflow).toHaveBeenCalledTimes(1);
  });

  it('surfaces a profile error and stays in edit mode when generateProfile rejects', async () => {
    const user = userEvent.setup();
    jest.mocked(generateProfileWorkflow).mockRejectedValueOnce(new Error('network down'));
    renderContainer();

    await submitGoalSummaryEdit(user, 'Director of Analytics');

    await waitFor(() => {
      expect(screen.getByText('network down')).toBeInTheDocument();
    });
    expect(usePathwaysStore.getState().errors.learnerProfile).toBe('network down');
    expect(usePathwaysStore.getState().experienceStatus).not.toBe('profile_ready');
    // Still in edit mode: the career-goal input is present and retains the typed value.
    expect(screen.getByLabelText('Career Goal')).toHaveValue('Director of Analytics');
  });

  it('navigates to the pathway section and marks the pathway ready when generatePathway resolves', async () => {
    const user = userEvent.setup();
    renderContainer();

    await user.click(screen.getByTestId('profile-build-pathway-button'));

    await waitFor(() => expect(usePathwaysStore.getState().section).toBe('pathway'));
    expect(usePathwaysStore.getState().experienceStatus).toBe('pathway_ready');
    expect(usePathwaysStore.getState().selectedCareerId).toBe('reporting-data-analysis-manager');
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

  it('sets a fallback pathway error without surfacing it in the UI and does not navigate when generatePathway rejects', async () => {
    const user = userEvent.setup();
    jest.mocked(generatePathwayWorkflow).mockRejectedValueOnce(new Error('boom'));
    renderContainer();

    await user.click(screen.getByTestId('profile-build-pathway-button'));

    await waitFor(() => {
      expect(usePathwaysStore.getState().errors.pathwayCourses).toBe('boom');
    });
    expect(usePathwaysStore.getState().section).not.toBe('pathway');
    expect(screen.queryByText('boom')).not.toBeInTheDocument();
    expect(screen.getByTestId('profile-build-pathway-button')).not.toBeDisabled();
  });

  it('submits the actual selected rendered career, not the first career, when a second career is selected', async () => {
    const user = userEvent.setup();
    act(() => {
      usePathwaysStore.setState({
        learnerProfile: { ...CAREER_SELECTION_STUB_PROFILE },
        careerMatches: CAREER_SELECTION_STUB_MATCHES,
      });
    });
    renderContainer();

    await user.click(screen.getByTestId(`career-match-${CAREER_SELECTION_STUB_MATCHES[1].id}`));
    await user.click(screen.getByTestId('profile-build-pathway-button'));

    await waitFor(() => expect(usePathwaysStore.getState().section).toBe('pathway'));
    expect(generatePathwayWorkflow).toHaveBeenCalledWith(expect.objectContaining({
      selectedCareer: expect.objectContaining({ id: CAREER_SELECTION_STUB_MATCHES[1].id }),
    }));
    expect(usePathwaysStore.getState().selectedCareerId).toBe(CAREER_SELECTION_STUB_MATCHES[1].id);
  });

  it('disables Build Pathway while the workflow is running and prevents duplicate submissions', async () => {
    const user = userEvent.setup();
    let resolveWorkflow: (value: { courses: [] }) => void = () => {};
    jest.mocked(generatePathwayWorkflow).mockReturnValue(
      new Promise((resolve) => { resolveWorkflow = resolve; }),
    );
    renderContainer();

    const buildButton = screen.getByTestId('profile-build-pathway-button');
    await user.click(buildButton);

    expect(buildButton).toBeDisabled();
    expect(generatePathwayWorkflow).toHaveBeenCalledTimes(1);

    await user.click(buildButton);
    expect(generatePathwayWorkflow).toHaveBeenCalledTimes(1);

    resolveWorkflow({ courses: [] });
    await waitFor(() => expect(usePathwaysStore.getState().section).toBe('pathway'));
  });
});
