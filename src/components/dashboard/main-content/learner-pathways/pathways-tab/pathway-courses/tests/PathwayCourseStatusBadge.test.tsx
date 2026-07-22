import '@testing-library/jest-dom/extend-expect';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { IntlProvider } from '@edx/frontend-platform/i18n';

import PathwayCourseStatusBadge from '../PathwayCourseStatusBadge';
import type { PathwayCourseStatus } from '../../state';

const renderComponent = (status: PathwayCourseStatus) => render(
  <IntlProvider locale="en">
    <PathwayCourseStatusBadge status={status} />
  </IntlProvider>,
);

describe('PathwayCourseStatusBadge', () => {
  it('renders "Completed" with the completed status class and a dot indicator', () => {
    renderComponent('completed');
    const label = screen.getByText('Completed');
    const badge = label.closest('.pathway-course-status-badge');
    expect(label).toBeInTheDocument();
    expect(badge).toHaveClass('pathway-course-status-badge--completed');
    expect(badge?.querySelector('.pathway-course-status-badge__dot')).toBeInTheDocument();
  });

  it('renders "In progress" with the in_progress status class and a dot indicator', () => {
    renderComponent('in_progress');
    const label = screen.getByText('In progress');
    const badge = label.closest('.pathway-course-status-badge');
    expect(label).toBeInTheDocument();
    expect(badge).toHaveClass('pathway-course-status-badge--in_progress');
    expect(badge?.querySelector('.pathway-course-status-badge__dot')).toBeInTheDocument();
  });

  it('renders "Not started" with the not_started status class and a dot indicator', () => {
    renderComponent('not_started');
    const label = screen.getByText('Not started');
    const badge = label.closest('.pathway-course-status-badge');
    expect(label).toBeInTheDocument();
    expect(badge).toHaveClass('pathway-course-status-badge--not_started');
    expect(badge?.querySelector('.pathway-course-status-badge__dot')).toBeInTheDocument();
  });
});
