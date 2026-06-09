import '@testing-library/jest-dom/extend-expect';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntlProvider } from '@edx/frontend-platform/i18n';
import { MemoryRouter } from 'react-router-dom';
import PathwayBreadcrumbs from './PathwayBreadcrumbs';
import { View } from '../constants';

const MockPathwayBreadcrumbs = ({
  view = 'profile',
  onNavigate = jest.fn(),
}: { view?: View, onNavigate?: (v: View) => void; }) => (
  <MemoryRouter>
    <IntlProvider locale="en">
      <PathwayBreadcrumbs
        view={view}
        onNavigate={onNavigate}
      />
    </IntlProvider>
  </MemoryRouter>
);

describe('PathwayBreadcrumbs', () => {
  it('profile view shows Onboarding link and calls onNavigate', async () => {
    const user = userEvent.setup();
    const onNavigate = jest.fn();
    render(<MockPathwayBreadcrumbs view="profile" onNavigate={onNavigate} />);
    expect(screen.getByText('Profile')).toBeInTheDocument();
    await user.click(screen.getByText('Onboarding Quiz'));
    expect(onNavigate).toHaveBeenCalledWith('onboarding');
  });

  it('pathway view shows two links and calls appropriate onNavigate', async () => {
    const user = userEvent.setup();
    const onNavigate = jest.fn();
    render(<MockPathwayBreadcrumbs view="pathway" onNavigate={onNavigate} />);
    expect(screen.getByText('Your Pathway')).toBeInTheDocument();
    await user.click(screen.getByText('Profile'));
    expect(onNavigate).toHaveBeenCalledWith('profile');
  });
});
