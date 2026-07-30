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
  it('renders the completed count and label in its own colored card', () => {
    renderComponent();
    const card = screen.getByTestId('pathway-progress-completed');
    expect(card).toHaveTextContent('1');
    expect(card).toHaveTextContent('Completed');
    expect(card).toHaveClass('pathway-progress-card--completed');
  });

  it('renders the in-progress count and label in its own colored card', () => {
    renderComponent();
    const card = screen.getByTestId('pathway-progress-in-progress');
    expect(card).toHaveTextContent('1');
    expect(card).toHaveTextContent('In progress');
    expect(card).toHaveClass('pathway-progress-card--in-progress');
  });

  it('renders the upcoming count and label in its own colored card', () => {
    renderComponent();
    const card = screen.getByTestId('pathway-progress-upcoming');
    expect(card).toHaveTextContent('3');
    expect(card).toHaveTextContent('Upcoming');
    expect(card).toHaveClass('pathway-progress-card--upcoming');
  });

  it('renders the total courses count and label in its own uncolored card', () => {
    renderComponent();
    const card = screen.getByTestId('pathway-progress-total');
    expect(card).toHaveTextContent('5');
    expect(card).toHaveTextContent('Total courses');
    expect(card).toHaveClass('pathway-progress-card--total');
  });

  it('renders each metric in a distinct card, not a single shared card', () => {
    renderComponent();
    const cards = [
      screen.getByTestId('pathway-progress-completed'),
      screen.getByTestId('pathway-progress-in-progress'),
      screen.getByTestId('pathway-progress-upcoming'),
      screen.getByTestId('pathway-progress-total'),
    ];
    const uniqueCards = new Set(cards);
    expect(uniqueCards.size).toBe(4);
  });
});
