import '@testing-library/jest-dom/extend-expect';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntlProvider } from '@edx/frontend-platform/i18n';
import { MemoryRouter } from 'react-router-dom';

import LearnerPathwaysTab from './LearnerPathwaysTab';
import intakeMessages from './intake/messages';
import { usePathwaysStore } from './state';
import { generatePathwayWorkflow, generateProfileWorkflow } from './workflows';
import useAlgoliaSearch from '../../../../app/data/hooks/useAlgoliaSearch';

// Integration spike (uncommitted): mock the workflow layer (not the transport
// service) so these tests exercise the real controller/workflow wiring while
// stubbing the network calls themselves.
jest.mock('./workflows', () => ({
  generateProfileWorkflow: jest.fn(),
  generatePathwayWorkflow: jest.fn(),
}));

jest.mock('../../../../app/data/hooks/useAlgoliaSearch', () => ({
  __esModule: true,
  default: jest.fn(),
}));

const mockSearchIndex = {} as unknown as ReturnType<typeof useAlgoliaSearch>['searchIndex'];

const mockLearningIntentResponse = {
  skillsRequired: ['SQL', 'Python'],
  skillsPreferred: ['Data Visualization'],
  condensedAlgoliaQuery: 'data analysis sql python',
};

const mockLearnerProfile = {
  summary: '',
  careerGoal: 'Data Analyst',
  targetIndustry: 'Technology',
  background: 'Operations',
  motivation: 'Career growth',
  learningStyle: '',
  weeklyTimeCommitment: '',
  certificatePreference: '',
  skills: ['SQL', 'Python'],
};

const mockCareerMatches = [
  { id: 'career-1', title: 'Real Taxonomy Data Analyst', skillsToDevelop: ['SQL'] },
];

const renderComponent = () => render(
  <MemoryRouter>
    <IntlProvider locale="en">
      <LearnerPathwaysTab />
    </IntlProvider>
  </MemoryRouter>,
);

const fillIntakeForm = async (
  user: ReturnType<typeof userEvent.setup>,
  values: { motivation: string; goal: string; background: string; industry: string },
) => {
  await user.type(screen.getByLabelText(intakeMessages.motivationQuestionLabel.defaultMessage), values.motivation);
  await user.type(screen.getByLabelText(intakeMessages.goalQuestionLabel.defaultMessage), values.goal);
  await user.type(screen.getByLabelText(intakeMessages.backgroundQuestionLabel.defaultMessage), values.background);
  await user.type(screen.getByLabelText(intakeMessages.industryQuestionLabel.defaultMessage), values.industry);
};

describe('LearnerPathwaysTab', () => {
  beforeEach(() => {
    usePathwaysStore.getState().resetPathwaysState();
    jest.clearAllMocks();
    jest.mocked(useAlgoliaSearch).mockReturnValue({
      searchIndex: mockSearchIndex,
      searchClient: {} as unknown as ReturnType<typeof useAlgoliaSearch>['searchClient'],
      shouldUseSecuredAlgoliaApiKey: true,
      catalogUuidsToCatalogQueryUuids: {},
    });
    jest.mocked(generateProfileWorkflow).mockResolvedValue({
      learningIntent: mockLearningIntentResponse,
      learnerProfile: mockLearnerProfile,
      careerMatches: mockCareerMatches,
    });
    jest.mocked(generatePathwayWorkflow).mockResolvedValue({ courses: [] });
  });

  it('navigates Onboarding -> Profile -> Pathway and uses breadcrumbs', async () => {
    const user = userEvent.setup();
    renderComponent();

    expect(screen.getByTestId('intake-questions-container')).toBeInTheDocument();
    const start = screen.getByRole('button', { name: intakeMessages.submitAndReviewProfile.defaultMessage });
    expect(start).toBeEnabled();

    await fillIntakeForm(user, {
      motivation: 'Motivation', goal: 'Goal', background: 'Background', industry: 'Industry',
    });
    await user.click(start);

    expect(await screen.findByTestId('profile-container')).toBeInTheDocument();

    await user.click(screen.getByTestId('profile-build-pathway-button'));
    expect(await screen.findByTestId('pathway-container')).toBeInTheDocument();

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

    await fillIntakeForm(user, {
      motivation: 'Motivation', goal: 'Goal', background: 'Background', industry: 'Industry',
    });
    await user.click(screen.getByRole('button', { name: intakeMessages.submitAndReviewProfile.defaultMessage }));
    expect(await screen.findByTestId('profile-container')).toBeInTheDocument();

    await user.click(screen.getByTestId('profile-build-pathway-button'));
    expect(await screen.findByTestId('pathway-container')).toBeInTheDocument();

    // pathway view's own "Adjust pathway" control, not the breadcrumb link
    await user.click(screen.getByTestId('pathway-adjust-button'));
    expect(screen.getByTestId('profile-container')).toBeInTheDocument();
  });

  // Integration spike (uncommitted) test coverage below.

  it('passes all four intake fields and the job index to the controller/workflow seam on submit', async () => {
    const user = userEvent.setup();
    renderComponent();

    await fillIntakeForm(user, {
      motivation: 'My motivation',
      goal: 'My goal',
      background: 'My background',
      industry: 'My industry',
    });
    await user.click(screen.getByRole('button', { name: intakeMessages.submitAndReviewProfile.defaultMessage }));

    await screen.findByTestId('profile-container');
    expect(generateProfileWorkflow).toHaveBeenCalledTimes(1);
    expect(generateProfileWorkflow).toHaveBeenCalledWith({
      answers: {
        motivation: 'My motivation',
        goal: 'My goal',
        background: 'My background',
        industry: 'My industry',
      },
      jobIndex: mockSearchIndex,
    });
  });

  it('does not call the workflow/service when form validation fails', async () => {
    const user = userEvent.setup();
    renderComponent();

    await user.click(screen.getByRole('button', { name: intakeMessages.submitAndReviewProfile.defaultMessage }));

    expect(generateProfileWorkflow).not.toHaveBeenCalled();
    expect(screen.getByTestId('intake-questions-container')).toBeInTheDocument();
  });

  it('disables the submit control while the Learning Intent request is in flight', async () => {
    const user = userEvent.setup();
    let resolveWorkflow: (value: {
      learningIntent: typeof mockLearningIntentResponse;
      learnerProfile: typeof mockLearnerProfile;
      careerMatches: typeof mockCareerMatches;
    }) => void = () => {};
    jest.mocked(generateProfileWorkflow).mockReturnValue(
      new Promise((resolve) => { resolveWorkflow = resolve; }),
    );
    renderComponent();

    await fillIntakeForm(user, {
      motivation: 'Motivation', goal: 'Goal', background: 'Background', industry: 'Industry',
    });
    const submitButton = screen.getByRole('button', { name: intakeMessages.submitAndReviewProfile.defaultMessage });
    await user.click(submitButton);

    expect(submitButton).toBeDisabled();
    expect(generateProfileWorkflow).toHaveBeenCalledTimes(1);

    // A duplicate click while loading must not trigger a second call.
    await user.click(submitButton);
    expect(generateProfileWorkflow).toHaveBeenCalledTimes(1);

    resolveWorkflow({
      learningIntent: mockLearningIntentResponse,
      learnerProfile: mockLearnerProfile,
      careerMatches: mockCareerMatches,
    });
    expect(await screen.findByTestId('profile-container')).toBeInTheDocument();
  });

  it('renders the real Career Selection UI with the taxonomy-derived career after a successful submission (no parallel debug page)', async () => {
    const user = userEvent.setup();
    renderComponent();

    await fillIntakeForm(user, {
      motivation: 'Motivation', goal: 'Goal', background: 'Background', industry: 'Industry',
    });
    await user.click(screen.getByRole('button', { name: intakeMessages.submitAndReviewProfile.defaultMessage }));

    const profileContainer = await screen.findByTestId('profile-container');
    expect(within(profileContainer).getByText('Real Taxonomy Data Analyst')).toBeInTheDocument();
    expect(screen.queryByTestId('spike-course-search-results')).not.toBeInTheDocument();
  });

  it('does not advance the section and surfaces an error when the request fails', async () => {
    const user = userEvent.setup();
    jest.mocked(generateProfileWorkflow).mockRejectedValueOnce(new Error('Enterprise Access is unavailable'));
    renderComponent();

    await fillIntakeForm(user, {
      motivation: 'Motivation', goal: 'Goal', background: 'Background', industry: 'Industry',
    });
    await user.click(screen.getByRole('button', { name: intakeMessages.submitAndReviewProfile.defaultMessage }));

    expect(await screen.findByTestId('intake-learning-intent-error')).toHaveTextContent('Enterprise Access is unavailable');
    expect(screen.getByTestId('intake-questions-container')).toBeInTheDocument();
    expect(screen.queryByTestId('profile-container')).not.toBeInTheDocument();
    expect(usePathwaysStore.getState().errors.learnerProfile).toBe('Enterprise Access is unavailable');
  });

  it('does not call the Recommendation Feedback (pathway) workflow during intake submission alone', async () => {
    const user = userEvent.setup();
    renderComponent();

    await fillIntakeForm(user, {
      motivation: 'Motivation', goal: 'Goal', background: 'Background', industry: 'Industry',
    });
    await user.click(screen.getByRole('button', { name: intakeMessages.submitAndReviewProfile.defaultMessage }));

    await screen.findByTestId('profile-container');
    expect(generatePathwayWorkflow).not.toHaveBeenCalled();
  });
});
