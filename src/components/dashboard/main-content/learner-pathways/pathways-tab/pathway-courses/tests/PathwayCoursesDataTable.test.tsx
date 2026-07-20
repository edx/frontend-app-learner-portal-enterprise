import '@testing-library/jest-dom/extend-expect';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { IntlProvider } from '@edx/frontend-platform/i18n';

import PathwayCoursesDataTable from '../PathwayCoursesDataTable';
import { PATHWAY_COURSES_STUB } from '../fixtures';
import type { PathwayCourse } from '../../state';

const renderComponent = (courses: PathwayCourse[] = PATHWAY_COURSES_STUB) => render(
  <IntlProvider locale="en">
    <PathwayCoursesDataTable courses={courses} />
  </IntlProvider>,
);

describe('PathwayCoursesDataTable', () => {
  it('renders the expected column headers', () => {
    renderComponent();
    ['Status', 'Course', 'Level', 'Why this fits you', 'Action'].forEach((header) => {
      expect(screen.getByRole('columnheader', { name: header })).toBeInTheDocument();
    });
  });

  it('renders all fixture courses', () => {
    renderComponent();
    PATHWAY_COURSES_STUB.forEach((course) => {
      expect(screen.getByText(course.title)).toBeInTheDocument();
    });
  });

  it('renders status badges with the correct counts', () => {
    renderComponent();
    expect(screen.getAllByText('Completed')).toHaveLength(1);
    expect(screen.getAllByText('In progress')).toHaveLength(1);
    expect(screen.getAllByText('Not started')).toHaveLength(3);
  });

  it('renders level badges', () => {
    renderComponent();
    expect(screen.getAllByText('Introductory')).toHaveLength(1);
    expect(screen.getAllByText('Intermediate')).toHaveLength(2);
    expect(screen.getAllByText('Advanced')).toHaveLength(2);
  });

  it('renders "why this fits you" copy', () => {
    renderComponent();
    expect(screen.getByText(PATHWAY_COURSES_STUB[0].whyThisFitsYou as string)).toBeInTheDocument();
  });

  it('renders row action buttons mapped from course status', () => {
    renderComponent();
    expect(screen.getAllByRole('button', { name: 'View Certificate' })).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: 'Continue' })).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: 'Register' })).toHaveLength(3);
  });

  it('renders "Not available" for a missing "why this fits you" value', () => {
    renderComponent([
      { courseKey: 'sparse-course', title: 'Sparse Course', status: 'not_started' },
    ]);
    expect(screen.getAllByText('Not available')).toHaveLength(1);
  });
});
