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
import { generatePathwayWorkflow } from './workflows';
import { PathwaysActionBarProvider } from './action-bar';

jest.mock('./workflows', () => ({
  generateProfileWorkflow: jest.fn(),
  generatePathwayWorkflow: jest.fn().mockResolvedValue({ courses: [] }),
}));

const mockJobIndex = {} as CareerSelectionContainerProps['jobIndex'];
const mockCatalogIndex = {} as CareerSelectionContainerProps['catalogIndex'];

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
    jest.mocked(generatePathwayWorkflow).mockResolvedValue({ courses: [] });
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

  it('applies the edit immediately without any network dependency', async () => {
    const user = userEvent.setup();
    renderContainer();

    await submitGoalSummaryEdit(user, 'Director of Analytics');

    await waitFor(() => {
      expect(usePathwaysStore.getState().learnerProfile?.careerGoal).toBe('Director of Analytics');
    });
    expect(usePathwaysStore.getState().experienceStatus).toBe('profile_ready');
    expect(usePathwaysStore.getState().errors.learnerProfile).toBeNull();
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
