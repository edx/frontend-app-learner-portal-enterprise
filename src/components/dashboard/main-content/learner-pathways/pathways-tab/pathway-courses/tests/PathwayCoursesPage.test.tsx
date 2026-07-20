import '@testing-library/jest-dom/extend-expect';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { IntlProvider } from '@edx/frontend-platform/i18n';

import PathwayCoursesPage from '../PathwayCoursesPage';
import { PATHWAY_COURSES_STUB } from '../fixtures';
import { derivePathwayProgress } from '../utils';

const renderComponent = () => render(
  <MemoryRouter>
    <IntlProvider locale="en">
      <PathwayCoursesPage
        courses={PATHWAY_COURSES_STUB}
        progress={derivePathwayProgress(PATHWAY_COURSES_STUB)}
        courseSearchUrl="/test-enterprise/search"
        contactEmail="admin@example.com"
        helpCenterUrl="https://enterprise-support.edx.org/s/"
      />
    </IntlProvider>
  </MemoryRouter>,
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

  it('renders the Need Help card after the courses table and before the end of the page', () => {
    renderComponent();
    const container = screen.getByTestId('pathway-container');
    const table = screen.getByRole('table');
    const needHelpCard = screen.getByTestId('pathway-need-help');
    expect(container).toContainElement(table);
    expect(container).toContainElement(needHelpCard);
    // eslint-disable-next-line no-bitwise
    expect(table.compareDocumentPosition(needHelpCard) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Need help?' })).toBeInTheDocument();
  });
});
