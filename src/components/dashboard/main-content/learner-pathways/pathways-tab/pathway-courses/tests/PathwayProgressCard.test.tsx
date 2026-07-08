import '@testing-library/jest-dom/extend-expect';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { IntlProvider } from '@edx/frontend-platform/i18n';

import PathwayProgressCard from '../PathwayProgressCard';

const progress = {
  completed: 1,
  inProgress: 1,
  upcoming: 3,
  totalCourses: 5,
};

const renderComponent = () => render(
  <IntlProvider locale="en">
    <PathwayProgressCard progress={progress} />
  </IntlProvider>,
);

describe('PathwayProgressCard', () => {
  it('renders the completed count and label', () => {
    renderComponent();
    expect(screen.getByTestId('pathway-progress-completed')).toHaveTextContent('1');
    expect(screen.getByTestId('pathway-progress-completed')).toHaveTextContent('Completed');
  });

  it('renders the in-progress count and label', () => {
    renderComponent();
    expect(screen.getByTestId('pathway-progress-in-progress')).toHaveTextContent('1');
    expect(screen.getByTestId('pathway-progress-in-progress')).toHaveTextContent('In progress');
  });

  it('renders the upcoming count and label', () => {
    renderComponent();
    expect(screen.getByTestId('pathway-progress-upcoming')).toHaveTextContent('3');
    expect(screen.getByTestId('pathway-progress-upcoming')).toHaveTextContent('Upcoming');
  });

  it('renders the total courses count and label', () => {
    renderComponent();
    expect(screen.getByTestId('pathway-progress-total')).toHaveTextContent('5');
    expect(screen.getByTestId('pathway-progress-total')).toHaveTextContent('Total courses');
  });
});
