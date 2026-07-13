import '@testing-library/jest-dom/extend-expect';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntlProvider } from '@edx/frontend-platform/i18n';

import PathwayCoursesContainer from './PathwayCoursesContainer';
import { PathwaysActionBarProvider } from './action-bar';
import { usePathwaysStore } from './state';

const renderComponent = (props = {}) => render(
  <IntlProvider locale="en">
    <PathwaysActionBarProvider>
      <PathwayCoursesContainer {...props} />
    </PathwaysActionBarProvider>
  </IntlProvider>,
);

describe('PathwayCoursesContainer', () => {
  beforeEach(() => {
    usePathwaysStore.getState().resetPathwaysState();
  });

  it('renders the pathway courses scaffold using fixture data when the store has no courses', () => {
    renderComponent();

    expect(screen.getByTestId('pathway-container')).toBeInTheDocument();
    expect(screen.getByText('Introduction to Corporate Finance')).toBeInTheDocument();
    expect(screen.getByText('Financial Analysis & Evaluation')).toBeInTheDocument();
  });

  it('uses store courses instead of fixtures when the store is populated', () => {
    usePathwaysStore.getState().setPathwayCourses([
      { id: 'custom-course', title: 'Custom Store Course', status: 'not_started' },
    ]);

    renderComponent();

    expect(screen.getByText('Custom Store Course')).toBeInTheDocument();
    expect(screen.queryByText('Introduction to Corporate Finance')).not.toBeInTheDocument();
  });

  it('derives progress metrics from the displayed (fixture) courses', () => {
    renderComponent();

    expect(screen.getByTestId('pathway-progress-completed')).toHaveTextContent('1');
    expect(screen.getByTestId('pathway-progress-in-progress')).toHaveTextContent('1');
    expect(screen.getByTestId('pathway-progress-upcoming')).toHaveTextContent('3');
    expect(screen.getByTestId('pathway-progress-total')).toHaveTextContent('5');
  });

  it('registers the Rebuild pathway action-bar button', () => {
    renderComponent();

    expect(screen.getByTestId('pathway-rebuild-button')).toBeInTheDocument();
    expect(screen.getAllByText('Rebuild pathway')).toHaveLength(1);
  });

  it('calls onBackToProfile when Rebuild pathway is clicked', async () => {
    const user = userEvent.setup();
    const onBackToProfile = jest.fn();
    renderComponent({ onBackToProfile });

    await user.click(screen.getByTestId('pathway-rebuild-button'));

    expect(onBackToProfile).toHaveBeenCalledTimes(1);
  });
});
