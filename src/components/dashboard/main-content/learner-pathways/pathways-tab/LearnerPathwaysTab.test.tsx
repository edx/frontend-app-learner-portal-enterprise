import '@testing-library/jest-dom/extend-expect';
import {
  render, screen, waitFor, within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntlProvider } from '@edx/frontend-platform/i18n';
import { MemoryRouter } from 'react-router-dom';

import LearnerPathwaysTab from './LearnerPathwaysTab';
import intakeMessages from './intake/messages';
import { usePathwaysStore } from './state';
import type { LearnerProfile, CareerMatch } from './state';
import { CAREER_SELECTION_STUB_MATCHES, CAREER_SELECTION_STUB_PROFILE } from './career-selection/fixtures';
import { generateProfileWorkflow } from './workflows';
import { useEnterpriseCustomer } from '../../../../app/data';
import { enterpriseCustomerFactory } from '../../../../app/data/services/data/__factories__';

jest.mock('./workflows', () => {
  // eslint-disable-next-line global-require
  const { CAREER_SELECTION_STUB_MATCHES: matches, CAREER_SELECTION_STUB_PROFILE: profile } = require('./career-selection/fixtures');
  // eslint-disable-next-line global-require
  const { PATHWAY_COURSES_STUB: courses } = require('./pathway-courses/fixtures');
  return {
    generateProfileWorkflow: jest.fn(() => Promise.resolve({
      learnerProfile: profile,
      careerMatches: matches,
    })),
    generatePathwayWorkflow: jest.fn().mockResolvedValue({ courses }),
  };
});

jest.mock('../../../../app/data/hooks', () => ({
  useSearchCatalogs: jest.fn(() => ['cat-1']),
  useAlgoliaSearch: jest.fn(() => ({ catalogUuidsToCatalogQueryUuids: { 'cat-1': 'query-1' } })),
}));
jest.mock('../../../../app/data', () => ({
  useEnterpriseCustomer: jest.fn(),
}));

const mockGenerateProfileWorkflow = generateProfileWorkflow as jest.Mock;

const renderComponent = () => render(
  <MemoryRouter>
    <IntlProvider locale="en">
      <LearnerPathwaysTab />
    </IntlProvider>
  </MemoryRouter>,
);

describe('LearnerPathwaysTab', () => {
  beforeEach(() => {
    usePathwaysStore.getState().resetPathwaysState();
    mockGenerateProfileWorkflow.mockClear();
    (useEnterpriseCustomer as jest.Mock).mockReturnValue({
      data: enterpriseCustomerFactory({ slug: 'test-enterprise' }),
    });
  });

  it('navigates Onboarding -> Profile -> Pathway and uses breadcrumbs', async () => {
    const user = userEvent.setup();
    renderComponent();

    expect(screen.getByTestId('intake-questions-container')).toBeInTheDocument();
    const start = screen.getByRole('button', { name: intakeMessages.submitAndReviewProfile.defaultMessage });
    expect(start).toBeEnabled();

    await user.type(screen.getByLabelText(intakeMessages.motivationQuestionLabel.defaultMessage), 'Motivation');
    await user.type(screen.getByLabelText(intakeMessages.goalQuestionLabel.defaultMessage), 'Goal');
    await user.type(screen.getByLabelText(intakeMessages.backgroundQuestionLabel.defaultMessage), 'Background');
    await user.type(screen.getByLabelText(intakeMessages.industryQuestionLabel.defaultMessage), 'Industry');
    await user.click(start);

    expect(screen.getByTestId('profile-container')).toBeInTheDocument();

    await user.click(screen.getByTestId('career-build-pathway-button'));
    expect(screen.getByTestId('pathway-container')).toBeInTheDocument();

    // breadcrumb: click Profile link to go back
    await user.click(screen.getByRole('link', { name: 'Profile' }));
    expect(screen.getByTestId('profile-container')).toBeInTheDocument();

    // breadcrumb: click Onboarding link to go back
    await user.click(screen.getByRole('link', { name: 'Onboarding Quiz' }));
    expect(screen.getByTestId('intake-questions-container')).toBeInTheDocument();
  });

  it('renders onboarding breadcrumb on initial', () => {
    renderComponent();
    const breadcrumbs = screen.getByTestId('pathway-breadcrumbs');
    expect(breadcrumbs).toBeInTheDocument();
    expect(within(breadcrumbs).getByText('Onboarding Quiz')).toBeInTheDocument();
  });

  it('navigates back from the pathway view using its own back control', async () => {
    const user = userEvent.setup();
    renderComponent();

    await user.type(screen.getByLabelText(intakeMessages.motivationQuestionLabel.defaultMessage), 'Motivation');
    await user.type(screen.getByLabelText(intakeMessages.goalQuestionLabel.defaultMessage), 'Goal');
    await user.type(screen.getByLabelText(intakeMessages.backgroundQuestionLabel.defaultMessage), 'Background');
    await user.type(screen.getByLabelText(intakeMessages.industryQuestionLabel.defaultMessage), 'Industry');
    await user.click(screen.getByRole('button', { name: intakeMessages.submitAndReviewProfile.defaultMessage }));
    expect(screen.getByTestId('profile-container')).toBeInTheDocument();

    await user.click(screen.getByTestId('career-build-pathway-button'));
    expect(screen.getByTestId('pathway-container')).toBeInTheDocument();

    // pathway view's own "Rebuild pathway" control, not the breadcrumb link
    await user.click(screen.getByTestId('pathway-rebuild-button'));
    expect(screen.getByTestId('profile-container')).toBeInTheDocument();
  });

  it('navigates back to onboarding after confirming the retake-quiz warning modal', async () => {
    const user = userEvent.setup();
    renderComponent();

    await user.type(screen.getByLabelText(intakeMessages.motivationQuestionLabel.defaultMessage), 'Motivation');
    await user.type(screen.getByLabelText(intakeMessages.goalQuestionLabel.defaultMessage), 'Goal');
    await user.type(screen.getByLabelText(intakeMessages.backgroundQuestionLabel.defaultMessage), 'Background');
    await user.type(screen.getByLabelText(intakeMessages.industryQuestionLabel.defaultMessage), 'Industry');
    await user.click(screen.getByRole('button', { name: intakeMessages.submitAndReviewProfile.defaultMessage }));
    expect(screen.getByTestId('profile-container')).toBeInTheDocument();

    await user.click(screen.getByTestId('career-retake-quiz-button'));
    expect(screen.getByText('Retake your onboarding quiz?')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Retake quiz' }));

    expect(screen.getByTestId('intake-questions-container')).toBeInTheDocument();
  });

  it('resets to a fresh "Build my pathway" state after retaking the quiz and resubmitting', async () => {
    const user = userEvent.setup();
    renderComponent();

    // Build the first pathway.
    await user.type(screen.getByLabelText(intakeMessages.motivationQuestionLabel.defaultMessage), 'Motivation');
    await user.type(screen.getByLabelText(intakeMessages.goalQuestionLabel.defaultMessage), 'Goal');
    await user.type(screen.getByLabelText(intakeMessages.backgroundQuestionLabel.defaultMessage), 'Background');
    await user.type(screen.getByLabelText(intakeMessages.industryQuestionLabel.defaultMessage), 'Industry');
    await user.click(screen.getByRole('button', { name: intakeMessages.submitAndReviewProfile.defaultMessage }));
    await user.click(screen.getByTestId('career-build-pathway-button'));
    expect(screen.getByTestId('pathway-container')).toBeInTheDocument();

    // Navigate back to profile, then retake the quiz.
    await user.click(screen.getByTestId('pathway-rebuild-button'));
    await user.click(screen.getByTestId('career-retake-quiz-button'));
    await user.click(screen.getByRole('button', { name: 'Retake quiz' }));
    expect(screen.getByTestId('intake-questions-container')).toBeInTheDocument();

    // Fill the form again and resubmit.
    await user.type(screen.getByLabelText(intakeMessages.motivationQuestionLabel.defaultMessage), 'New motivation');
    await user.type(screen.getByLabelText(intakeMessages.goalQuestionLabel.defaultMessage), 'New goal');
    await user.type(screen.getByLabelText(intakeMessages.backgroundQuestionLabel.defaultMessage), 'New background');
    await user.type(screen.getByLabelText(intakeMessages.industryQuestionLabel.defaultMessage), 'New industry');
    await user.click(screen.getByRole('button', { name: intakeMessages.submitAndReviewProfile.defaultMessage }));

    // Back on the profile page, it should look like a first-time build.
    expect(screen.getByTestId('profile-container')).toBeInTheDocument();
    expect(screen.getByTestId('career-build-pathway-button')).toBeInTheDocument();
    expect(screen.queryByTestId('career-view-current-pathway-button')).not.toBeInTheDocument();
    expect(screen.queryByTestId('career-rebuild-pathway-button')).not.toBeInTheDocument();
    expect(usePathwaysStore.getState().pathwayCourses).toEqual([]);
    expect(usePathwaysStore.getState().pathwayInputFingerprint).toBeNull();
  });

  it('shows blank intake fields immediately after confirming retake, not the previous answers', async () => {
    const user = userEvent.setup();
    renderComponent();

    await user.type(screen.getByLabelText(intakeMessages.motivationQuestionLabel.defaultMessage), 'Motivation');
    await user.type(screen.getByLabelText(intakeMessages.goalQuestionLabel.defaultMessage), 'Goal');
    await user.type(screen.getByLabelText(intakeMessages.backgroundQuestionLabel.defaultMessage), 'Background');
    await user.type(screen.getByLabelText(intakeMessages.industryQuestionLabel.defaultMessage), 'Industry');
    await user.click(screen.getByRole('button', { name: intakeMessages.submitAndReviewProfile.defaultMessage }));
    await user.click(screen.getByTestId('career-build-pathway-button'));
    expect(screen.getByTestId('pathway-container')).toBeInTheDocument();

    await user.click(screen.getByTestId('pathway-rebuild-button'));
    await user.click(screen.getByTestId('career-retake-quiz-button'));
    await user.click(screen.getByRole('button', { name: 'Retake quiz' }));

    expect(screen.getByLabelText(intakeMessages.motivationQuestionLabel.defaultMessage)).toHaveValue('');
    expect(screen.getByLabelText(intakeMessages.goalQuestionLabel.defaultMessage)).toHaveValue('');
    expect(screen.getByLabelText(intakeMessages.backgroundQuestionLabel.defaultMessage)).toHaveValue('');
    expect(screen.getByLabelText(intakeMessages.industryQuestionLabel.defaultMessage)).toHaveValue('');
  });

  describe('Intake -> profile generation', () => {
    const fillIntake = async (user: ReturnType<typeof userEvent.setup>) => {
      await user.type(screen.getByLabelText(intakeMessages.motivationQuestionLabel.defaultMessage), 'Motivation');
      await user.type(screen.getByLabelText(intakeMessages.goalQuestionLabel.defaultMessage), 'Goal');
      await user.type(screen.getByLabelText(intakeMessages.backgroundQuestionLabel.defaultMessage), 'Background');
      await user.type(screen.getByLabelText(intakeMessages.industryQuestionLabel.defaultMessage), 'Industry');
    };

    it('calls generateProfileWorkflow exactly once with the exact trimmed canonical values', async () => {
      const user = userEvent.setup();
      renderComponent();

      await fillIntake(user);
      await user.click(screen.getByRole('button', { name: intakeMessages.submitAndReviewProfile.defaultMessage }));

      expect(mockGenerateProfileWorkflow).toHaveBeenCalledTimes(1);
      expect(mockGenerateProfileWorkflow).toHaveBeenCalledWith({
        motivation: 'Motivation',
        careerGoal: 'Goal',
        background: 'Background',
        targetIndustry: 'Industry',
      });
    });

    it('shows the loading label, disables the submit action, and blocks duplicate submissions while pending', async () => {
      const user = userEvent.setup();
      let resolveWorkflow: (value: { learnerProfile: LearnerProfile; careerMatches: CareerMatch[] }) => void = () => {};
      mockGenerateProfileWorkflow.mockReturnValueOnce(new Promise((resolve) => {
        resolveWorkflow = resolve;
      }));
      renderComponent();

      await fillIntake(user);
      const submitButton = screen.getByRole('button', { name: intakeMessages.submitAndReviewProfile.defaultMessage });
      await user.click(submitButton);

      const pendingButton = screen.getByTestId('intake-submit-button');
      expect(pendingButton).toBeDisabled();
      expect(pendingButton).toHaveTextContent(intakeMessages.submittingProfile.defaultMessage);
      expect(screen.getByTestId('intake-questions-container')).toBeInTheDocument();
      expect(screen.queryByTestId('profile-container')).not.toBeInTheDocument();

      // A second click attempt while pending must not start a second workflow call.
      await user.click(pendingButton);
      expect(mockGenerateProfileWorkflow).toHaveBeenCalledTimes(1);

      resolveWorkflow({
        learnerProfile: CAREER_SELECTION_STUB_PROFILE,
        careerMatches: CAREER_SELECTION_STUB_MATCHES,
      });
      await waitFor(() => expect(screen.getByTestId('profile-container')).toBeInTheDocument());
    });

    it('commits the exact submitted intent, generated profile, and career matches before navigating', async () => {
      const user = userEvent.setup();
      const generatedProfile: LearnerProfile = {
        summary: 'A generated summary', learningStyle: '', weeklyTimeCommitment: '', certificatePreference: '', skills: ['SQL'],
      };
      const generatedMatches: CareerMatch[] = [{ id: 'real-career-1', title: 'Real Career' }];
      mockGenerateProfileWorkflow.mockResolvedValueOnce({
        learnerProfile: generatedProfile,
        careerMatches: generatedMatches,
      });
      renderComponent();

      await fillIntake(user);
      await user.click(screen.getByRole('button', { name: intakeMessages.submitAndReviewProfile.defaultMessage }));

      await waitFor(() => expect(screen.getByTestId('profile-container')).toBeInTheDocument());
      expect(usePathwaysStore.getState().learnerIntent).toEqual({
        motivation: 'Motivation', careerGoal: 'Goal', background: 'Background', targetIndustry: 'Industry',
      });
      expect(usePathwaysStore.getState().learnerProfile).toEqual(generatedProfile);
      expect(usePathwaysStore.getState().careerMatches).toEqual(generatedMatches);
      expect(screen.getByText('Real Career')).toBeInTheDocument();
    });

    it('treats an empty career-matches result as success: commits it and navigates, without substituting stub matches', async () => {
      const user = userEvent.setup();
      const generatedProfile: LearnerProfile = {
        summary: 'No career matches were found for your current goal.', learningStyle: '', weeklyTimeCommitment: '', certificatePreference: '', skills: [],
      };
      mockGenerateProfileWorkflow.mockResolvedValueOnce({
        learnerProfile: generatedProfile,
        careerMatches: [],
      });
      renderComponent();

      await fillIntake(user);
      await user.click(screen.getByRole('button', { name: intakeMessages.submitAndReviewProfile.defaultMessage }));

      await waitFor(() => expect(screen.getByTestId('profile-container')).toBeInTheDocument());
      expect(usePathwaysStore.getState().learnerProfile).toEqual(generatedProfile);
      expect(usePathwaysStore.getState().careerMatches).toEqual([]);
      expect(usePathwaysStore.getState().careerMatches).not.toEqual(CAREER_SELECTION_STUB_MATCHES);
    });

    it('stays on Intake with the answers preserved and an error shown when generateProfileWorkflow rejects', async () => {
      const user = userEvent.setup();
      mockGenerateProfileWorkflow.mockRejectedValueOnce(new Error('Learning Intent service unavailable'));
      renderComponent();

      await fillIntake(user);
      await user.click(screen.getByRole('button', { name: intakeMessages.submitAndReviewProfile.defaultMessage }));

      await waitFor(() => expect(screen.getByText('Learning Intent service unavailable')).toBeInTheDocument());
      expect(screen.getByTestId('intake-questions-container')).toBeInTheDocument();
      expect(screen.queryByTestId('profile-container')).not.toBeInTheDocument();
      expect(screen.getByLabelText(intakeMessages.motivationQuestionLabel.defaultMessage)).toHaveValue('Motivation');
      expect(screen.getByLabelText(intakeMessages.goalQuestionLabel.defaultMessage)).toHaveValue('Goal');
      expect(usePathwaysStore.getState().learnerProfile).toBeNull();
      expect(screen.getByRole('button', { name: intakeMessages.submitAndReviewProfile.defaultMessage })).toBeEnabled();
    });

    it('clears the stale error and succeeds on retry with the current values', async () => {
      const user = userEvent.setup();
      mockGenerateProfileWorkflow.mockRejectedValueOnce(new Error('Learning Intent service unavailable'));
      renderComponent();

      await fillIntake(user);
      await user.click(screen.getByRole('button', { name: intakeMessages.submitAndReviewProfile.defaultMessage }));
      await waitFor(() => expect(screen.getByText('Learning Intent service unavailable')).toBeInTheDocument());

      mockGenerateProfileWorkflow.mockResolvedValueOnce({
        learnerProfile: CAREER_SELECTION_STUB_PROFILE,
        careerMatches: CAREER_SELECTION_STUB_MATCHES,
      });
      await user.click(screen.getByRole('button', { name: intakeMessages.submitAndReviewProfile.defaultMessage }));

      await waitFor(() => expect(screen.getByTestId('profile-container')).toBeInTheDocument());
      expect(mockGenerateProfileWorkflow).toHaveBeenCalledTimes(2);
      expect(mockGenerateProfileWorkflow).toHaveBeenLastCalledWith({
        motivation: 'Motivation', careerGoal: 'Goal', background: 'Background', targetIndustry: 'Industry',
      });
      expect(screen.queryByText('Learning Intent service unavailable')).not.toBeInTheDocument();
    });
  });
});
