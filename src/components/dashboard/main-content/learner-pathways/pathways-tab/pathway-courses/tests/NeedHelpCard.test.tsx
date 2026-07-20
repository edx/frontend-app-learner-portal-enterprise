import '@testing-library/jest-dom/extend-expect';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { IntlProvider } from '@edx/frontend-platform/i18n';

import NeedHelpCard, { NeedHelpCardProps } from '../NeedHelpCard';

const defaultProps: NeedHelpCardProps = {
  courseSearchUrl: '/test-enterprise/search',
  contactEmail: 'admin@example.com',
  helpCenterUrl: 'https://enterprise-support.edx.org/s/',
};

const renderComponent = (props: Partial<NeedHelpCardProps> = {}) => render(
  <MemoryRouter>
    <IntlProvider locale="en">
      <NeedHelpCard {...defaultProps} {...props} />
    </IntlProvider>
  </MemoryRouter>,
);

describe('NeedHelpCard', () => {
  it('renders the heading and full support copy', () => {
    renderComponent();
    expect(screen.getByRole('heading', { name: 'Need help?' })).toBeInTheDocument();
    expect(screen.getByText(/If you still need help finding courses, try the/)).toBeInTheDocument();
  });

  it('renders the course search link pointing at the resolved course search URL', () => {
    renderComponent();
    const searchLink = screen.getByRole('link', { name: 'course search' });
    expect(searchLink).toHaveAttribute('href', '/test-enterprise/search');
  });

  it('renders the admin contact link as a mailto link when contactEmail is provided', () => {
    renderComponent();
    const adminLink = screen.getByRole('link', { name: /contact your organization's edX administrator/ });
    expect(adminLink).toHaveAttribute('href', expect.stringContaining('mailto:admin@example.com'));
  });

  it('renders the admin contact text without a link when contactEmail is not provided', () => {
    renderComponent({ contactEmail: null });
    expect(screen.queryByRole('link', { name: /contact your organization's edX administrator/ })).not.toBeInTheDocument();
    expect(screen.getByText(/contact your organization's edX administrator/)).toBeInTheDocument();
  });

  it('supports an array of admin emails from the contact-resolution fallback', () => {
    renderComponent({ contactEmail: ['admin1@example.com', 'admin2@example.com'] });
    const adminLink = screen.getByRole('link', { name: /contact your organization's edX administrator/ });
    expect(adminLink).toHaveAttribute('href', expect.stringContaining('mailto:admin1@example.com,admin2@example.com'));
  });

  it('renders the Help Center link using the canonical LEARNER_SUPPORT_URL and opens in a new tab', () => {
    renderComponent();
    const helpLink = screen.getByRole('link', { name: /edX Help Center/ });
    expect(helpLink).toHaveAttribute('href', 'https://enterprise-support.edx.org/s/');
    expect(helpLink).toHaveAttribute('target', '_blank');
    expect(helpLink).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });
});
