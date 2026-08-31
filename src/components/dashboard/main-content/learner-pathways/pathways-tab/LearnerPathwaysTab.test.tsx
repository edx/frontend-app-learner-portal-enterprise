import '@testing-library/jest-dom/extend-expect';
import {
  act, render, screen, waitFor, within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider } from '@tanstack/react-query';
import { IntlProvider } from '@edx/frontend-platform/i18n';
import { getAuthenticatedUser } from '@edx/frontend-platform/auth';
import { MemoryRouter, useSearchParams } from 'react-router-dom';
import { sendEnterpriseTrackEvent } from '@2uinc/frontend-enterprise-utils';

import LearnerPathwaysTab from './LearnerPathwaysTab';
import intakeMessages from './intake/messages';
import { usePathwaysStore } from './state';
import type { LearnerProfile, CareerMatch } from './state';
import { CAREER_SELECTION_STUB_MATCHES, CAREER_SELECTION_STUB_PROFILE } from './career-selection/fixtures';
import { generateDirectPathwayWorkflow, generateProfileWorkflow } from './workflows';
import { useEnterpriseCourseEnrollments, useEnterpriseCustomer } from '../../../../app/data';
import { enterpriseCustomerFactory } from '../../../../app/data/services/data/__factories__';
import { queryClient } from '../../../../../utils/tests';
import { PATHWAYS_EVENTS } from '../../../../../eventTracking';

jest.mock('@2uinc/frontend-enterprise-utils', () => ({
  ...jest.requireActual('@2uinc/frontend-enterprise-utils'),
  sendEnterpriseTrackEvent: jest.fn(),
}));

// PathwayCoursesContainer's one-time feedback prompt calls getAuthenticatedUser() to
// scope its localStorage marker, so every path that reaches a populated Pathway page
// needs this mocked.
jest.mock('@edx/frontend-platform/auth');
const mockGetAuthenticatedUser = getAuthenticatedUser as jest.Mock;

jest.mock('./workflows', () => {
  // eslint-disable-next-line global-require
  const { CAREER_SELECTION_STUB_MATCHES: matches, CAREER_SELECTION_STUB_PROFILE: profile } = require('./career-selection/fixtures');
  // eslint-disable-next-line global-require
  const { PATHWAY_COURSES_STUB: courses } = require('./pathway-courses/fixtures');
  return {
    generateProfileWorkflow: jest.fn(() => Promise.resolve({
      learnerProfile: profile,
      careerMatches: matches,
      skillsRequiredCount: 3,
      skillsPreferredCount: 2,
    })),
    generatePathwayWorkflow: jest.fn().mockResolvedValue({ courses }),
    generateDirectPathwayWorkflow: jest.fn().mockResolvedValue({ courses: [] }),
  };
});

jest.mock('../../../../app/data/hooks', () => ({
  useSearchCatalogs: jest.fn(() => ['cat-1']),
  useAlgoliaSearch: jest.fn(() => ({ catalogUuidsToCatalogQueryUuids: { 'cat-1': 'query-1' } })),
}));
jest.mock('../../../../app/data', () => ({
  useEnterpriseCustomer: jest.fn(),
  useEnterpriseCourseEnrollments: jest.fn(),
}));

const mockGenerateProfileWorkflow = generateProfileWorkflow as jest.Mock;
const mockGenerateDirectPathwayWorkflow = generateDirectPathwayWorkflow as jest.Mock;
const mockEnterpriseCustomer = enterpriseCustomerFactory({ slug: 'test-enterprise' });

const renderComponent = () => render(
  <QueryClientProvider client={queryClient()}>
    <MemoryRouter>
      <IntlProvider locale="en">
        <LearnerPathwaysTab />
      </IntlProvider>
    </MemoryRouter>
  </QueryClientProvider>,
);

const LocationSearchProbe = () => {
  const [searchParams] = useSearchParams();
  return <div data-testid="location-search-probe">{searchParams.toString()}</div>;
};

const renderWithSearch = (search: string) => render(
  <QueryClientProvider client={queryClient()}>
    <MemoryRouter initialEntries={[`/${search}`]}>
      <IntlProvider locale="en">
        <LearnerPathwaysTab />
        <LocationSearchProbe />
      </IntlProvider>
    </MemoryRouter>
  </QueryClientProvider>,
);

describe('LearnerPathwaysTab', () => {
  beforeEach(() => {
    usePathwaysStore.getState().resetPathwaysState();
    mockGenerateProfileWorkflow.mockClear();
    mockGenerateDirectPathwayWorkflow.mockClear();
    mockGenerateDirectPathwayWorkflow.mockResolvedValue({ courses: [] });
    (sendEnterpriseTrackEvent as jest.Mock).mockClear();
    (useEnterpriseCustomer as jest.Mock).mockReturnValue({
      data: mockEnterpriseCustomer,
    });
    (useEnterpriseCourseEnrollments as jest.Mock).mockReturnValue({
      data: { enterpriseCourseEnrollments: [], allEnrollmentsByStatus: {} },
    });
    mockGetAuthenticatedUser.mockReturnValue({ username: 'test-learner' });
    global.localStorage.clear();
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
    await user.click(screen.getByRole('link', { name: 'Career profile' }));
    expect(screen.getByTestId('profile-container')).toBeInTheDocument();

    // breadcrumb: click Onboarding link — opens the same retake-quiz confirmation modal
    // as the dedicated action-row button, rather than navigating immediately.
    await user.click(screen.getByRole('link', { name: 'Onboarding quiz' }));
    expect(screen.getByText('Retake your onboarding quiz?')).toBeInTheDocument();
    expect(screen.queryByTestId('intake-questions-container')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Retake quiz' }));
    expect(screen.getByTestId('intake-questions-container')).toBeInTheDocument();
  });

  it('opening the retake-quiz modal via the breadcrumb from the Profile page, then cancelling, resets nothing and restores focus to the breadcrumb link', async () => {
    const user = userEvent.setup();
    renderComponent();

    await user.type(screen.getByLabelText(intakeMessages.motivationQuestionLabel.defaultMessage), 'Motivation');
    await user.type(screen.getByLabelText(intakeMessages.goalQuestionLabel.defaultMessage), 'Goal');
    await user.type(screen.getByLabelText(intakeMessages.backgroundQuestionLabel.defaultMessage), 'Background');
    await user.type(screen.getByLabelText(intakeMessages.industryQuestionLabel.defaultMessage), 'Industry');
    await user.click(screen.getByRole('button', { name: intakeMessages.submitAndReviewProfile.defaultMessage }));
    expect(screen.getByTestId('profile-container')).toBeInTheDocument();

    const breadcrumbLink = screen.getByRole('link', { name: 'Onboarding quiz' });
    await user.click(breadcrumbLink);
    expect(screen.getByText('Retake your onboarding quiz?')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.getByTestId('profile-container')).toBeInTheDocument();
    expect(screen.queryByText('Retake your onboarding quiz?')).not.toBeInTheDocument();
    expect(breadcrumbLink).toHaveFocus();
  });

  it('opening the retake-quiz modal via the breadcrumb from the Pathway Courses page (its only path back to onboarding) confirms and resets the store', async () => {
    const user = userEvent.setup();
    renderComponent();

    await user.type(screen.getByLabelText(intakeMessages.motivationQuestionLabel.defaultMessage), 'Motivation');
    await user.type(screen.getByLabelText(intakeMessages.goalQuestionLabel.defaultMessage), 'Goal');
    await user.type(screen.getByLabelText(intakeMessages.backgroundQuestionLabel.defaultMessage), 'Background');
    await user.type(screen.getByLabelText(intakeMessages.industryQuestionLabel.defaultMessage), 'Industry');
    await user.click(screen.getByRole('button', { name: intakeMessages.submitAndReviewProfile.defaultMessage }));
    await user.click(screen.getByTestId('career-build-pathway-button'));
    expect(screen.getByTestId('pathway-container')).toBeInTheDocument();

    // PathwayCoursesContainer registers no retake-quiz action-row button of its own —
    // the breadcrumb is the only path back to onboarding from this page.
    await user.click(screen.getByRole('link', { name: 'Onboarding quiz' }));
    expect(screen.getByText('Retake your onboarding quiz?')).toBeInTheDocument();
    expect(screen.getByTestId('pathway-container')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Retake quiz' }));

    expect(screen.getByTestId('intake-questions-container')).toBeInTheDocument();
    expect(usePathwaysStore.getState().pathwayCourses).toEqual([]);
    expect(usePathwaysStore.getState().pathwayInputFingerprint).toBeNull();
  });

  it('cancelling the breadcrumb-triggered retake-quiz modal from the Pathway Courses page leaves the existing pathway untouched', async () => {
    const user = userEvent.setup();
    renderComponent();

    await user.type(screen.getByLabelText(intakeMessages.motivationQuestionLabel.defaultMessage), 'Motivation');
    await user.type(screen.getByLabelText(intakeMessages.goalQuestionLabel.defaultMessage), 'Goal');
    await user.type(screen.getByLabelText(intakeMessages.backgroundQuestionLabel.defaultMessage), 'Background');
    await user.type(screen.getByLabelText(intakeMessages.industryQuestionLabel.defaultMessage), 'Industry');
    await user.click(screen.getByRole('button', { name: intakeMessages.submitAndReviewProfile.defaultMessage }));
    await user.click(screen.getByTestId('career-build-pathway-button'));
    expect(screen.getByTestId('pathway-container')).toBeInTheDocument();
    const priorCourses = usePathwaysStore.getState().pathwayCourses;
    const priorFingerprint = usePathwaysStore.getState().pathwayInputFingerprint;

    await user.click(screen.getByRole('link', { name: 'Onboarding quiz' }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.getByTestId('pathway-container')).toBeInTheDocument();
    expect(usePathwaysStore.getState().pathwayCourses).toEqual(priorCourses);
    expect(usePathwaysStore.getState().pathwayInputFingerprint).toEqual(priorFingerprint);
  });

  it('renders onboarding breadcrumb on initial', () => {
    renderComponent();
    const breadcrumbs = screen.getByTestId('pathway-breadcrumbs');
    expect(breadcrumbs).toBeInTheDocument();
    expect(within(breadcrumbs).getByText('Onboarding quiz')).toBeInTheDocument();
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
      const generatedMatches: CareerMatch[] = [
        { id: 'real-career-1', title: 'Real Career', skillsToDevelop: ['SQL'] },
      ];
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

  describe('direct flow (?pathwaysFlow=direct)', () => {
    const fillIntake = async (user: ReturnType<typeof userEvent.setup>) => {
      await user.type(screen.getByLabelText(intakeMessages.motivationQuestionLabel.defaultMessage), 'Motivation');
      await user.type(screen.getByLabelText(intakeMessages.goalQuestionLabel.defaultMessage), 'Goal');
      await user.type(screen.getByLabelText(intakeMessages.backgroundQuestionLabel.defaultMessage), 'Background');
      await user.type(screen.getByLabelText(intakeMessages.industryQuestionLabel.defaultMessage), 'Industry');
    };

    const directCourses = [
      { courseKey: 'direct-course-1', title: 'Direct Course One', status: 'not_started' as const },
    ];

    it('calls generateDirectPathwayWorkflow exactly once with the exact learnerIntent, enterpriseCustomerUuid, and catalogScope, and never calls generateProfileWorkflow', async () => {
      const user = userEvent.setup();
      mockGenerateDirectPathwayWorkflow.mockResolvedValueOnce({ courses: directCourses });
      renderWithSearch('?pathwaysFlow=direct');

      await fillIntake(user);
      await user.click(screen.getByRole('button', { name: intakeMessages.generateRecommendations.defaultMessage }));

      await waitFor(() => expect(screen.getByTestId('pathway-container')).toBeInTheDocument());
      expect(mockGenerateDirectPathwayWorkflow).toHaveBeenCalledTimes(1);
      expect(mockGenerateDirectPathwayWorkflow).toHaveBeenCalledWith({
        learnerIntent: {
          motivation: 'Motivation', careerGoal: 'Goal', background: 'Background', targetIndustry: 'Industry',
        },
        enterpriseCustomerUuid: mockEnterpriseCustomer.uuid,
        catalogScope: {
          searchCatalogs: ['cat-1'],
          catalogUuidsToCatalogQueryUuids: { 'cat-1': 'query-1' },
        },
      });
      expect(mockGenerateProfileWorkflow).not.toHaveBeenCalled();
    });

    it('a successful non-empty result commits the store atomically and lands directly on Pathway, never rendering Career Profile', async () => {
      const user = userEvent.setup();
      mockGenerateDirectPathwayWorkflow.mockResolvedValueOnce({ courses: directCourses });
      renderWithSearch('?pathwaysFlow=direct');

      await fillIntake(user);
      await user.click(screen.getByRole('button', { name: intakeMessages.generateRecommendations.defaultMessage }));

      await waitFor(() => expect(screen.getByTestId('pathway-container')).toBeInTheDocument());
      expect(screen.queryByTestId('profile-container')).not.toBeInTheDocument();
      expect(screen.getByText('Direct Course One')).toBeInTheDocument();

      const state = usePathwaysStore.getState();
      expect(state.section).toBe('pathway');
      expect(state.pathwayCourses).toEqual(directCourses);
      expect(state.pathwayGenerationMode).toBe('direct');
      expect(state.learnerProfile).toBeNull();
      expect(state.careerMatches).toEqual([]);
      expect(state.pathwayInputFingerprint).toBeNull();
    });

    it('renders a two-step breadcrumb trail on the direct Pathway page with no Career Profile label', async () => {
      const user = userEvent.setup();
      mockGenerateDirectPathwayWorkflow.mockResolvedValueOnce({ courses: directCourses });
      renderWithSearch('?pathwaysFlow=direct');

      await fillIntake(user);
      await user.click(screen.getByRole('button', { name: intakeMessages.generateRecommendations.defaultMessage }));

      await waitFor(() => expect(screen.getByTestId('pathway-container')).toBeInTheDocument());
      expect(screen.getByText('Pathway')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Onboarding quiz' })).toBeInTheDocument();
      expect(screen.queryByText('Career profile')).not.toBeInTheDocument();
    });

    it('the direct Pathway leading action opens the existing retake-quiz modal rather than navigating to Profile', async () => {
      const user = userEvent.setup();
      mockGenerateDirectPathwayWorkflow.mockResolvedValueOnce({ courses: directCourses });
      renderWithSearch('?pathwaysFlow=direct');

      await fillIntake(user);
      await user.click(screen.getByRole('button', { name: intakeMessages.generateRecommendations.defaultMessage }));
      await waitFor(() => expect(screen.getByTestId('pathway-container')).toBeInTheDocument());

      await user.click(screen.getByTestId('pathway-retake-quiz-button'));
      expect(screen.getByText('Retake your onboarding quiz?')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(screen.getByTestId('pathway-container')).toBeInTheDocument();
      expect(usePathwaysStore.getState().pathwayCourses).toEqual(directCourses);

      await user.click(screen.getByTestId('pathway-retake-quiz-button'));
      await user.click(screen.getByRole('button', { name: 'Retake quiz' }));
      expect(screen.getByTestId('intake-questions-container')).toBeInTheDocument();
      expect(usePathwaysStore.getState().pathwayCourses).toEqual([]);
      expect(usePathwaysStore.getState().pathwayGenerationMode).toBeNull();
    });

    it('an empty result stays on Intake with the no-eligible-courses message, preserves values, and re-enables submit', async () => {
      const user = userEvent.setup();
      mockGenerateDirectPathwayWorkflow.mockResolvedValueOnce({ courses: [] });
      renderWithSearch('?pathwaysFlow=direct');

      await fillIntake(user);
      await user.click(screen.getByRole('button', { name: intakeMessages.generateRecommendations.defaultMessage }));

      await waitFor(() => {
        expect(screen.getByText(intakeMessages.noEligibleDirectCourses.defaultMessage)).toBeInTheDocument();
      });
      expect(screen.getByTestId('intake-questions-container')).toBeInTheDocument();
      expect(screen.queryByTestId('pathway-container')).not.toBeInTheDocument();
      expect(screen.getByLabelText(intakeMessages.motivationQuestionLabel.defaultMessage)).toHaveValue('Motivation');
      expect(screen.getByLabelText(intakeMessages.goalQuestionLabel.defaultMessage)).toHaveValue('Goal');
      expect(screen.getByRole('button', { name: intakeMessages.generateRecommendations.defaultMessage })).toBeEnabled();

      const state = usePathwaysStore.getState();
      expect(state.section).toBe('onboarding');
      expect(state.pathwayCourses).toEqual([]);
      expect(state.pathwayGenerationMode).toBeNull();
    });

    it('a genuine workflow rejection displays its message and commits nothing', async () => {
      const user = userEvent.setup();
      mockGenerateDirectPathwayWorkflow.mockRejectedValueOnce(new Error('Xpert service unavailable'));
      renderWithSearch('?pathwaysFlow=direct');

      await fillIntake(user);
      await user.click(screen.getByRole('button', { name: intakeMessages.generateRecommendations.defaultMessage }));

      await waitFor(() => expect(screen.getByText('Xpert service unavailable')).toBeInTheDocument());
      expect(screen.getByTestId('intake-questions-container')).toBeInTheDocument();
      expect(usePathwaysStore.getState().pathwayCourses).toEqual([]);
      expect(usePathwaysStore.getState().pathwayGenerationMode).toBeNull();
    });

    it('shows direct-mode submit/loading copy instead of the career labels', async () => {
      const user = userEvent.setup();
      let resolveWorkflow: (value: { courses: typeof directCourses }) => void = () => {};
      mockGenerateDirectPathwayWorkflow.mockReturnValueOnce(new Promise((resolve) => {
        resolveWorkflow = resolve;
      }));
      renderWithSearch('?pathwaysFlow=direct');

      await fillIntake(user);
      expect(screen.getByRole('button', { name: intakeMessages.generateRecommendations.defaultMessage })).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: intakeMessages.generateRecommendations.defaultMessage }));

      const pendingButton = screen.getByTestId('intake-submit-button');
      expect(pendingButton).toHaveTextContent(intakeMessages.findingCourses.defaultMessage);

      resolveWorkflow({ courses: directCourses });
      await waitFor(() => expect(screen.getByTestId('pathway-container')).toBeInTheDocument());
    });

    it('with ?pathwaysFlow=career, still uses the existing career flow', async () => {
      const user = userEvent.setup();
      renderWithSearch('?pathwaysFlow=career');

      await fillIntake(user);
      await user.click(screen.getByRole('button', { name: intakeMessages.submitAndReviewProfile.defaultMessage }));

      await waitFor(() => expect(screen.getByTestId('profile-container')).toBeInTheDocument());
      expect(mockGenerateProfileWorkflow).toHaveBeenCalledTimes(1);
      expect(mockGenerateDirectPathwayWorkflow).not.toHaveBeenCalled();
    });

    it('with an unrecognized ?pathwaysFlow value, falls back to the existing career flow', async () => {
      const user = userEvent.setup();
      renderWithSearch('?pathwaysFlow=bogus');

      await fillIntake(user);
      await user.click(screen.getByRole('button', { name: intakeMessages.submitAndReviewProfile.defaultMessage }));

      await waitFor(() => expect(screen.getByTestId('profile-container')).toBeInTheDocument());
      expect(mockGenerateProfileWorkflow).toHaveBeenCalledTimes(1);
    });

    it('does not mutate or remove unrelated query params after a successful direct submit', async () => {
      const user = userEvent.setup();
      mockGenerateDirectPathwayWorkflow.mockResolvedValueOnce({ courses: directCourses });
      renderWithSearch('?utm_source=foo&pathwaysFlow=direct');
      const before = screen.getByTestId('location-search-probe').textContent;

      await fillIntake(user);
      await user.click(screen.getByRole('button', { name: intakeMessages.generateRecommendations.defaultMessage }));

      await waitFor(() => expect(screen.getByTestId('pathway-container')).toBeInTheDocument());
      expect(screen.getByTestId('location-search-probe')).toHaveTextContent(before as string);
    });

    describe('flow-variant conflicts', () => {
      it('a career-mode pathway is not shown under ?pathwaysFlow=direct — Intake renders and the store is untouched', () => {
        act(() => {
          usePathwaysStore.setState({
            section: 'pathway', pathwayCourses: directCourses, pathwayGenerationMode: 'career',
          });
        });

        renderWithSearch('?pathwaysFlow=direct');

        expect(screen.getByTestId('intake-questions-container')).toBeInTheDocument();
        expect(screen.queryByTestId('pathway-container')).not.toBeInTheDocument();
        expect(usePathwaysStore.getState().section).toBe('pathway');
        expect(usePathwaysStore.getState().pathwayCourses).toEqual(directCourses);
      });

      it('a direct-mode pathway is not shown under the default (career) variant — Intake renders and the store is untouched', () => {
        act(() => {
          usePathwaysStore.setState({
            section: 'pathway', pathwayCourses: directCourses, pathwayGenerationMode: 'direct',
          });
        });

        renderComponent();

        expect(screen.getByTestId('intake-questions-container')).toBeInTheDocument();
        expect(screen.queryByTestId('pathway-container')).not.toBeInTheDocument();
        expect(usePathwaysStore.getState().section).toBe('pathway');
      });

      it('a matching persisted mode and active variant renders the Pathway page normally', () => {
        act(() => {
          usePathwaysStore.setState({
            section: 'pathway', pathwayCourses: directCourses, pathwayGenerationMode: 'direct',
          });
        });

        renderWithSearch('?pathwaysFlow=direct');

        expect(screen.getByTestId('pathway-container')).toBeInTheDocument();
      });

      it('a persisted "profile" section is not shown under ?pathwaysFlow=direct — Intake renders and the store is untouched', () => {
        act(() => {
          usePathwaysStore.setState({
            section: 'profile', learnerProfile: CAREER_SELECTION_STUB_PROFILE, careerMatches: CAREER_SELECTION_STUB_MATCHES,
          });
        });

        renderWithSearch('?pathwaysFlow=direct');

        expect(screen.getByTestId('intake-questions-container')).toBeInTheDocument();
        expect(screen.queryByTestId('profile-container')).not.toBeInTheDocument();
        expect(usePathwaysStore.getState().section).toBe('profile');
      });
    });
  });

  describe('pathways analytics events', () => {
    const fillIntake = async (user: ReturnType<typeof userEvent.setup>) => {
      await user.type(screen.getByLabelText(intakeMessages.motivationQuestionLabel.defaultMessage), 'Motivation');
      await user.type(screen.getByLabelText(intakeMessages.goalQuestionLabel.defaultMessage), 'Goal');
      await user.type(screen.getByLabelText(intakeMessages.backgroundQuestionLabel.defaultMessage), 'Background');
      await user.type(screen.getByLabelText(intakeMessages.industryQuestionLabel.defaultMessage), 'Industry');
    };

    it('fires step.viewed exactly once for the initial onboarding render, with isResumedSession false', () => {
      renderComponent();

      const stepViewedCalls = (sendEnterpriseTrackEvent as jest.Mock).mock.calls
        .filter(([, eventName]) => eventName === PATHWAYS_EVENTS.STEP_VIEWED);
      expect(stepViewedCalls).toEqual([
        [mockEnterpriseCustomer.uuid, PATHWAYS_EVENTS.STEP_VIEWED, expect.objectContaining({
          pathwayStep: 'onboarding', isResumedSession: false, navigationSource: 'initial_render',
        })],
      ]);
    });

    it('fires step.viewed once per step as a fresh session progresses through onboarding -> profile -> pathway, never re-firing for the same step', async () => {
      const user = userEvent.setup();
      renderComponent();

      await fillIntake(user);
      await user.click(screen.getByRole('button', { name: intakeMessages.submitAndReviewProfile.defaultMessage }));
      expect(screen.getByTestId('profile-container')).toBeInTheDocument();

      await user.click(screen.getByTestId('career-build-pathway-button'));
      expect(screen.getByTestId('pathway-container')).toBeInTheDocument();

      const stepViewedCalls = (sendEnterpriseTrackEvent as jest.Mock).mock.calls
        .filter(([, eventName]) => eventName === PATHWAYS_EVENTS.STEP_VIEWED);
      expect(stepViewedCalls).toEqual([
        [mockEnterpriseCustomer.uuid, PATHWAYS_EVENTS.STEP_VIEWED, expect.objectContaining({
          pathwayStep: 'onboarding', isResumedSession: false, navigationSource: 'initial_render',
        })],
        [mockEnterpriseCustomer.uuid, PATHWAYS_EVENTS.STEP_VIEWED, expect.objectContaining({
          pathwayStep: 'profile', isResumedSession: false, navigationSource: 'workflow_completion',
        })],
        [mockEnterpriseCustomer.uuid, PATHWAYS_EVENTS.STEP_VIEWED, expect.objectContaining({
          pathwayStep: 'pathway', isResumedSession: false, navigationSource: 'workflow_completion',
        })],
      ]);
    });

    it('fires a single step.viewed with isResumedSession true when the store is hydrated mid-journey on mount', () => {
      act(() => {
        usePathwaysStore.setState({ section: 'profile', learnerProfile: CAREER_SELECTION_STUB_PROFILE, careerMatches: CAREER_SELECTION_STUB_MATCHES });
      });

      renderComponent();

      const stepViewedCalls = (sendEnterpriseTrackEvent as jest.Mock).mock.calls
        .filter(([, eventName]) => eventName === PATHWAYS_EVENTS.STEP_VIEWED);
      expect(stepViewedCalls).toEqual([
        [mockEnterpriseCustomer.uuid, PATHWAYS_EVENTS.STEP_VIEWED, expect.objectContaining({
          pathwayStep: 'profile', isResumedSession: true,
        })],
      ]);
    });

    it('fires intake.submitted with the count of completed fields and a length category per field', async () => {
      const user = userEvent.setup();
      renderComponent();

      await fillIntake(user);
      await user.click(screen.getByRole('button', { name: intakeMessages.submitAndReviewProfile.defaultMessage }));

      expect(sendEnterpriseTrackEvent).toHaveBeenCalledWith(
        mockEnterpriseCustomer.uuid,
        PATHWAYS_EVENTS.INTAKE_SUBMITTED,
        expect.objectContaining({
          fieldsCompletedCount: 4,
          motivationLengthCategory: 'short',
          careerGoalLengthCategory: 'short',
          backgroundLengthCategory: 'short',
          targetIndustryLengthCategory: 'short',
        }),
      );
    });

    it('fires profile.generation_completed with outcome "succeeded" and career-match details on a successful submission', async () => {
      const user = userEvent.setup();
      renderComponent();

      await fillIntake(user);
      await user.click(screen.getByRole('button', { name: intakeMessages.submitAndReviewProfile.defaultMessage }));

      await waitFor(() => expect(sendEnterpriseTrackEvent).toHaveBeenCalledWith(
        mockEnterpriseCustomer.uuid,
        PATHWAYS_EVENTS.PROFILE_GENERATION_COMPLETED,
        expect.objectContaining({
          source: 'intake',
          outcome: 'succeeded',
          careerMatchCount: CAREER_SELECTION_STUB_MATCHES.length,
          displayableCareerMatchCount: expect.any(Number),
          careerMatchIds: CAREER_SELECTION_STUB_MATCHES.slice(0, 10).map((match) => match.id),
          intentSkillsCount: CAREER_SELECTION_STUB_PROFILE.skills.length,
          skillsRequiredCount: 3,
          skillsPreferredCount: 2,
        }),
      ));
    });

    it('fires profile.generation_completed with outcome "no_matches" when career matches are empty', async () => {
      const user = userEvent.setup();
      const generatedProfile: LearnerProfile = {
        summary: 'No career matches were found for your current goal.', learningStyle: '', weeklyTimeCommitment: '', certificatePreference: '', skills: [],
      };
      mockGenerateProfileWorkflow.mockResolvedValueOnce({
        learnerProfile: generatedProfile, careerMatches: [], skillsRequiredCount: 0, skillsPreferredCount: 0,
      });
      renderComponent();

      await fillIntake(user);
      await user.click(screen.getByRole('button', { name: intakeMessages.submitAndReviewProfile.defaultMessage }));

      await waitFor(() => expect(sendEnterpriseTrackEvent).toHaveBeenCalledWith(
        mockEnterpriseCustomer.uuid,
        PATHWAYS_EVENTS.PROFILE_GENERATION_COMPLETED,
        expect.objectContaining({
          source: 'intake',
          outcome: 'no_matches',
          careerMatchCount: 0,
          displayableCareerMatchCount: 0,
          careerMatchIds: [],
          intentSkillsCount: 0,
        }),
      ));
    });

    it('fires profile.generation_completed with outcome "failed" when generateProfileWorkflow rejects', async () => {
      const user = userEvent.setup();
      mockGenerateProfileWorkflow.mockRejectedValueOnce(new Error('Learning Intent service unavailable'));
      renderComponent();

      await fillIntake(user);
      await user.click(screen.getByRole('button', { name: intakeMessages.submitAndReviewProfile.defaultMessage }));

      await waitFor(() => expect(sendEnterpriseTrackEvent).toHaveBeenCalledWith(
        mockEnterpriseCustomer.uuid,
        PATHWAYS_EVENTS.PROFILE_GENERATION_COMPLETED,
        expect.objectContaining({ source: 'intake', outcome: 'failed' }),
      ));
    });

    it('fires quiz.retaken with the pathwayStep the learner retook from', async () => {
      const user = userEvent.setup();
      renderComponent();

      await fillIntake(user);
      await user.click(screen.getByRole('button', { name: intakeMessages.submitAndReviewProfile.defaultMessage }));
      await user.click(screen.getByTestId('career-build-pathway-button'));
      expect(screen.getByTestId('pathway-container')).toBeInTheDocument();

      await user.click(screen.getByRole('link', { name: 'Onboarding quiz' }));
      await user.click(screen.getByRole('button', { name: 'Retake quiz' }));

      expect(sendEnterpriseTrackEvent).toHaveBeenCalledWith(
        mockEnterpriseCustomer.uuid,
        PATHWAYS_EVENTS.QUIZ_RETAKEN,
        expect.objectContaining({ pathwayStep: 'pathway' }),
      );
    });

    it('fires control.interacted for the retake-quiz modal on open and cancel', async () => {
      const user = userEvent.setup();
      renderComponent();

      await fillIntake(user);
      await user.click(screen.getByRole('button', { name: intakeMessages.submitAndReviewProfile.defaultMessage }));

      await user.click(screen.getByTestId('career-retake-quiz-button'));
      expect(sendEnterpriseTrackEvent).toHaveBeenCalledWith(
        mockEnterpriseCustomer.uuid,
        PATHWAYS_EVENTS.CONTROL_INTERACTED,
        expect.objectContaining({ sourceComponent: 'retake_quiz_modal', interactionAction: 'opened' }),
      );

      await user.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(sendEnterpriseTrackEvent).toHaveBeenCalledWith(
        mockEnterpriseCustomer.uuid,
        PATHWAYS_EVENTS.CONTROL_INTERACTED,
        expect.objectContaining({ sourceComponent: 'retake_quiz_modal', interactionAction: 'cancelled' }),
      );
    });

    it('tags a breadcrumb-driven step transition with navigationSource "breadcrumb"', async () => {
      const user = userEvent.setup();
      renderComponent();

      await fillIntake(user);
      await user.click(screen.getByRole('button', { name: intakeMessages.submitAndReviewProfile.defaultMessage }));
      await user.click(screen.getByTestId('career-build-pathway-button'));
      await user.click(screen.getByRole('link', { name: 'Career profile' }));

      expect(sendEnterpriseTrackEvent).toHaveBeenCalledWith(
        mockEnterpriseCustomer.uuid,
        PATHWAYS_EVENTS.STEP_VIEWED,
        expect.objectContaining({ pathwayStep: 'profile', navigationSource: 'breadcrumb' }),
      );
    });
  });
});
