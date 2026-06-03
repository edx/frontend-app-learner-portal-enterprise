import '@testing-library/jest-dom/extend-expect';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntlProvider } from '@edx/frontend-platform/i18n';

import LearnerPathwaysTab from './LearnerPathwaysTab';

const renderComponent = () => render(
  <IntlProvider locale="en">
    <LearnerPathwaysTab />
  </IntlProvider>,
);

describe('LearnerPathwaysTab', () => {
  it('renders initial-state sections for onboarding, profile, and pathway', () => {
    renderComponent();
    expect(screen.getByTestId('learner-pathways-tab-scaffold')).toBeInTheDocument();
    expect(screen.getByTestId('learner-pathways-tab-initial-state')).toBeInTheDocument();
    expect(screen.getByTestId('learner-pathways-entry-section')).toBeInTheDocument();
    expect(screen.getByTestId('learner-pathways-profile-section')).toBeInTheDocument();
    expect(screen.getByTestId('learner-pathways-pathway-section')).toBeInTheDocument();
  });

  it('navigates Initial -> Onboarding -> Profile -> Pathway and uses breadcrumbs', async () => {
    const user = userEvent.setup();
    renderComponent();

    const start = screen.getByTestId('learner-pathways-action-start-onboarding');
    expect(start).toBeEnabled();
    await user.click(start);
    expect(screen.getByTestId('intake-questions-container')).toBeInTheDocument();

    await user.click(screen.getByTestId('intake-continue-button'));
    expect(screen.getByTestId('profile-container')).toBeInTheDocument();

    await user.click(screen.getByTestId('profile-build-pathway-button'));
    expect(screen.getByTestId('pathway-container')).toBeInTheDocument();

    // breadcrumb: click Profile link to go back
    await user.click(screen.getByTestId('breadcrumb-link-profile'));
    expect(screen.getByTestId('profile-container')).toBeInTheDocument();

    // breadcrumb: click Onboarding link to go back
    await user.click(screen.getByTestId('breadcrumb-link-onboarding-quiz'));
    expect(screen.getByTestId('intake-questions-container')).toBeInTheDocument();
  });

  it('does not render breadcrumb on initial', () => {
    renderComponent();
    expect(screen.queryByTestId('pathway-breadcrumbs')).toBeNull();
  });
});
