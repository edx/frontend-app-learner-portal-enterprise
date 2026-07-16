import '@testing-library/jest-dom/extend-expect';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntlProvider } from '@edx/frontend-platform/i18n';

import PathwayCourseActionButton from '../PathwayCourseActionButton';
import type { PathwayCourse, PathwayCourseStatus } from '../../state';

const buildCourse = (status: PathwayCourseStatus): PathwayCourse => ({
  courseKey: 'course-1',
  title: 'Test Course',
  status,
});

const renderComponent = (
  status: PathwayCourseStatus,
  onCourseAction?: (course: PathwayCourse) => void,
) => render(
  <IntlProvider locale="en">
    <PathwayCourseActionButton course={buildCourse(status)} onCourseAction={onCourseAction} />
  </IntlProvider>,
);

describe('PathwayCourseActionButton', () => {
  it('renders "View Certificate" for a completed course', () => {
    renderComponent('completed');
    expect(screen.getByRole('button', { name: 'View Certificate' })).toBeInTheDocument();
  });

  it('renders "Continue" for an in-progress course', () => {
    renderComponent('in_progress');
    expect(screen.getByRole('button', { name: 'Continue' })).toBeInTheDocument();
  });

  it('renders "Register" for a not-started course', () => {
    renderComponent('not_started');
    expect(screen.getByRole('button', { name: 'Register' })).toBeInTheDocument();
  });

  it('renders a native type="button" element', () => {
    renderComponent('not_started');
    expect(screen.getByRole('button', { name: 'Register' })).toHaveAttribute('type', 'button');
  });

  it('calls onCourseAction with the full course when clicked', async () => {
    const user = userEvent.setup();
    const onCourseAction = jest.fn();
    const course = buildCourse('not_started');
    render(
      <IntlProvider locale="en">
        <PathwayCourseActionButton course={course} onCourseAction={onCourseAction} />
      </IntlProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'Register' }));

    expect(onCourseAction).toHaveBeenCalledTimes(1);
    expect(onCourseAction).toHaveBeenCalledWith(course);
  });

  it('does not throw when no click handler is provided', async () => {
    const user = userEvent.setup();
    renderComponent('not_started');

    await expect(user.click(screen.getByRole('button', { name: 'Register' }))).resolves.not.toThrow();
  });
});
