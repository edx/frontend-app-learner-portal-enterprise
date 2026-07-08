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
  it('renders "Completed" for a completed course', () => {
    renderComponent('completed');
    expect(screen.getByText('Completed')).toBeInTheDocument();
  });

  it('renders "In progress" for an in-progress course', () => {
    renderComponent('in_progress');
    expect(screen.getByText('In progress')).toBeInTheDocument();
  });

  it('renders "Not started" for a not-started course', () => {
    renderComponent('not_started');
    expect(screen.getByText('Not started')).toBeInTheDocument();
  });
});
