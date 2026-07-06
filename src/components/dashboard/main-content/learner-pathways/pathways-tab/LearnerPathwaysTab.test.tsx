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

    await user.click(screen.getByTestId('profile-build-pathway-button'));
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

  it('navigates back from the pathway view using its own back controls', async () => {
    const user = userEvent.setup();
    renderComponent();

    await user.type(screen.getByLabelText(intakeMessages.motivationQuestionLabel.defaultMessage), 'Motivation');
    await user.type(screen.getByLabelText(intakeMessages.goalQuestionLabel.defaultMessage), 'Goal');
    await user.type(screen.getByLabelText(intakeMessages.backgroundQuestionLabel.defaultMessage), 'Background');
    await user.type(screen.getByLabelText(intakeMessages.industryQuestionLabel.defaultMessage), 'Industry');
    await user.click(screen.getByRole('button', { name: intakeMessages.submitAndReviewProfile.defaultMessage }));
    expect(screen.getByTestId('profile-container')).toBeInTheDocument();

    await user.click(screen.getByTestId('profile-build-pathway-button'));
    expect(screen.getByTestId('pathway-container')).toBeInTheDocument();

    // pathway view's own "View Profile" control, not the breadcrumb link
    await user.click(screen.getByTestId('pathway-view-profile-button'));
    expect(screen.getByTestId('profile-container')).toBeInTheDocument();

    await user.click(screen.getByTestId('profile-build-pathway-button'));
    expect(screen.getByTestId('pathway-container')).toBeInTheDocument();

    // pathway view's own "View Onboarding Quiz" control, not the breadcrumb link
    await user.click(screen.getByTestId('pathway-view-onboarding-button'));
    expect(screen.getByTestId('intake-questions-container')).toBeInTheDocument();
  });
});
