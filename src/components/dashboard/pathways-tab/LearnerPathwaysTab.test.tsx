import '@testing-library/jest-dom/extend-expect';
import { render, screen } from '@testing-library/react';
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

  it('renders expected initial-state content and primary action', () => {
    renderComponent();
    expect(screen.getByText('Build your personalized pathway!')).toBeInTheDocument();
    expect(screen.getByText('1. Onboarding Quiz')).toBeInTheDocument();
    expect(screen.getByText('2. Review your profile')).toBeInTheDocument();
    expect(screen.getByText('3. Start your pathway')).toBeInTheDocument();
    expect(screen.getByTestId('learner-pathways-action-start-onboarding')).toBeInTheDocument();
  });
});
