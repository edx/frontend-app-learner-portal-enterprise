import '@testing-library/jest-dom/extend-expect';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { IntlProvider } from '@edx/frontend-platform/i18n';

import PathwayCourseStatusBadge from '../PathwayCourseStatusBadge';

const renderComponent = (status: 'completed' | 'in_progress' | 'not_started') => render(
  <IntlProvider locale="en">
    <PathwayCourseStatusBadge status={status} />
  </IntlProvider>,
);

describe('PathwayCourseStatusBadge', () => {
  it('renders "Completed" with the success variant for a completed course', () => {
    renderComponent('completed');
    const badge = screen.getByText('Completed');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('badge-success');
  });

  it('renders "In progress" with the warning variant for an in-progress course', () => {
    renderComponent('in_progress');
    const badge = screen.getByText('In progress');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('badge-warning');
  });

  it('renders "Not started" with the light variant for a not-started course', () => {
    renderComponent('not_started');
    const badge = screen.getByText('Not started');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('badge-light');
  });
});
