import '@testing-library/jest-dom/extend-expect';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntlProvider } from '@edx/frontend-platform/i18n';
import { MemoryRouter } from 'react-router-dom';

import LearnerPathwaysTab from './LearnerPathwaysTab';
import intakeMessages from './intake/messages';
import { usePathwaysStore } from './state';

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
});
