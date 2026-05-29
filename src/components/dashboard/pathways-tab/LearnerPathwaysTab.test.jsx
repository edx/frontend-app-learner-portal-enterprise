import '@testing-library/jest-dom/extend-expect';
import { render, screen } from '@testing-library/react';
import { IntlProvider } from '@edx/frontend-platform/i18n';
import userEvent from '@testing-library/user-event';

import { DASHBOARD_COURSES_TAB } from '../data/constants';
import LearnerPathwaysTab from './LearnerPathwaysTab';

const renderComponent = (props = {}) => render(
  <IntlProvider locale="en">
    <LearnerPathwaysTab onSelectTab={jest.fn()} {...props} />
  </IntlProvider>,
);

describe('LearnerPathwaysTab', () => {
  it('renders placeholder sections for entry, profile, and pathway states', () => {
    renderComponent();
    expect(screen.getByTestId('learner-pathways-tab-scaffold')).toBeInTheDocument();
    expect(screen.getByTestId('learner-pathways-entry-section')).toBeInTheDocument();
    expect(screen.getByTestId('learner-pathways-profile-section')).toBeInTheDocument();
    expect(screen.getByTestId('learner-pathways-pathway-section')).toBeInTheDocument();
  });

  it('renders expected placeholder actions', () => {
    renderComponent();
    expect(screen.getByTestId('learner-pathways-action-start-onboarding')).toBeInTheDocument();
    expect(screen.getByTestId('learner-pathways-action-generate-pathway')).toBeInTheDocument();
    expect(screen.getByTestId('learner-pathways-action-skip-courses')).toBeInTheDocument();
  });

  it('navigates to courses tab when skip action is clicked', async () => {
    const user = userEvent.setup();
    const onSelectTab = jest.fn();
    renderComponent({ onSelectTab });

    await user.click(screen.getByTestId('learner-pathways-action-skip-courses'));
    expect(onSelectTab).toHaveBeenCalledWith(DASHBOARD_COURSES_TAB);
  });
});
