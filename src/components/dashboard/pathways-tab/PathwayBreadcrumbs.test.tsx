import '@testing-library/jest-dom/extend-expect';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PathwayBreadcrumbs from './PathwayBreadcrumbs';

describe('PathwayBreadcrumbs', () => {
  it('does not render on initial', () => {
    render(<PathwayBreadcrumbs view="initial" onNavigate={() => {}} />);
    expect(screen.queryByTestId('pathway-breadcrumbs')).toBeNull();
  });

  it('profile view shows Onboarding link and calls onNavigate', async () => {
    const user = userEvent.setup();
    const onNavigate = jest.fn();
    render(<PathwayBreadcrumbs view="profile" onNavigate={onNavigate} />);
    expect(screen.getByText('Profile')).toBeInTheDocument();
    await user.click(screen.getByText('Onboarding Quiz'));
    expect(onNavigate).toHaveBeenCalledWith('onboarding');
  });

  it('pathway view shows two links and calls appropriate onNavigate', async () => {
    const user = userEvent.setup();
    const onNavigate = jest.fn();
    render(<PathwayBreadcrumbs view="pathway" onNavigate={onNavigate} />);
    expect(screen.getByText('Your Pathway')).toBeInTheDocument();
    await user.click(screen.getByText('Profile'));
    expect(onNavigate).toHaveBeenCalledWith('profile');
  });
});
