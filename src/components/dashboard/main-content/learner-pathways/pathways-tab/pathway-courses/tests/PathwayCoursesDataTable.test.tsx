import '@testing-library/jest-dom/extend-expect';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { IntlProvider } from '@edx/frontend-platform/i18n';

import PathwayCoursesDataTable from '../PathwayCoursesDataTable';
import { PATHWAY_COURSES_STUB } from '../fixtures';
import { resolvePathwayCourses } from '../resolvePathwayCourses';
import type { ResolvedPathwayCourse } from '../resolvePathwayCourses';
import type { PathwayCourse } from '../../state';

const ENTERPRISE_SLUG = 'test-enterprise';

const resolve = (courses: PathwayCourse[]) => resolvePathwayCourses({
  pathwayCourses: courses,
  enrollments: [],
  enterpriseSlug: ENTERPRISE_SLUG,
}).courses;

const renderComponent = (courses: ResolvedPathwayCourse[] = resolve(PATHWAY_COURSES_STUB)) => render(
  <MemoryRouter>
    <IntlProvider locale="en">
      <PathwayCoursesDataTable courses={courses} />
    </IntlProvider>
  </MemoryRouter>,
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

  it('renders every row as Not started with a View Course action when there are no enrollments', () => {
    renderComponent();
    expect(screen.getAllByText('Not started')).toHaveLength(PATHWAY_COURSES_STUB.length);
    expect(screen.getAllByRole('link', { name: /View Course/ })).toHaveLength(PATHWAY_COURSES_STUB.length);
    expect(screen.queryByText('Completed')).not.toBeInTheDocument();
    expect(screen.queryByText('In progress')).not.toBeInTheDocument();
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

  it('renders "Not available" for a missing "why this fits you" value', () => {
    renderComponent(resolve([
      { courseKey: 'sparse-course', title: 'Sparse Course', status: 'not_started' },
    ]));
    expect(screen.getAllByText('Not available')).toHaveLength(1);
  });

  it('drives the badge and action from the resolved row status, not a stale seed status', () => {
    renderComponent(resolve([
      { courseKey: 'seeded-completed', title: 'Seeded Completed Course', status: 'completed' },
    ]));
    expect(screen.getByText('Not started')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /View Course/ })).toBeInTheDocument();
    expect(screen.queryByText('Completed')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /View Certificate/ })).not.toBeInTheDocument();
  });

  it('renders an accessible row action whose name includes the course title', () => {
    renderComponent(resolve([
      { courseKey: 'corporate-finance', title: 'Introduction to Corporate Finance', status: 'not_started' },
    ]));
    expect(screen.getByRole('link', { name: /Introduction to Corporate Finance/ })).toBeInTheDocument();
  });
});
