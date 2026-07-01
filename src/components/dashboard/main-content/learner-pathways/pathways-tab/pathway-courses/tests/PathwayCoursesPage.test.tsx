import '@testing-library/jest-dom/extend-expect';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { IntlProvider } from '@edx/frontend-platform/i18n';

import PathwayCoursesPage from '../PathwayCoursesPage';
import { PATHWAY_COURSES_STUB } from '../fixtures';
import { derivePathwayProgress } from '../utils';

const renderComponent = () => render(
  <IntlProvider locale="en">
    <PathwayCoursesPage
      courses={PATHWAY_COURSES_STUB}
      progress={derivePathwayProgress(PATHWAY_COURSES_STUB)}
    />
  </IntlProvider>,
);

describe('PathwayCoursesPage', () => {
  it('renders the pathway-container test id', () => {
    renderComponent();
    expect(screen.getByTestId('pathway-container')).toBeInTheDocument();
  });

  it('renders the title and beta badge', () => {
    renderComponent();
    expect(screen.getByText('Your Personalized Learning Pathway')).toBeInTheDocument();
    expect(screen.getByText('Beta')).toBeInTheDocument();
  });

  it('renders the instructions copy', () => {
    renderComponent();
    expect(
      screen.getByText('Based on your goals and background, here are the courses we recommend.'),
    ).toBeInTheDocument();
  });

  it('renders the progress card and courses table', () => {
    renderComponent();
    expect(screen.getByText('Total courses')).toBeInTheDocument();
    expect(screen.getByText('Introduction to Corporate Finance')).toBeInTheDocument();
  });
});
