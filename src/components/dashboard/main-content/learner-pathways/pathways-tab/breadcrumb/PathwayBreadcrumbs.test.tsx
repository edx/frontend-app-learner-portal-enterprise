import '@testing-library/jest-dom/extend-expect';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntlProvider } from '@edx/frontend-platform/i18n';
import { MemoryRouter } from 'react-router-dom';
import PathwayBreadcrumbs from './PathwayBreadcrumbs';
import { View } from '../constants';
import type { PathwaysFlowVariant } from '../flowVariant';

const MockPathwayBreadcrumbs = ({
  view = 'profile',
  onNavigate = jest.fn(),
  flowVariant,
}: { view?: View, onNavigate?: (v: View) => void; flowVariant?: PathwaysFlowVariant; }) => (
  <MemoryRouter>
    <IntlProvider locale="en">
      <PathwayBreadcrumbs
        view={view}
        onNavigate={onNavigate}
        flowVariant={flowVariant}
      />
    </IntlProvider>
  </MemoryRouter>
);

describe('PathwayBreadcrumbs', () => {
  it('profile view shows Onboarding link and calls onNavigate', async () => {
    const user = userEvent.setup();
    const onNavigate = jest.fn();
    render(<MockPathwayBreadcrumbs view="profile" onNavigate={onNavigate} />);
    expect(screen.getByText('Career profile')).toBeInTheDocument();
    await user.click(screen.getByText('Onboarding quiz'));
    expect(onNavigate).toHaveBeenCalledWith('onboarding');
  });

  it('pathway view shows two links and calls appropriate onNavigate', async () => {
    const user = userEvent.setup();
    const onNavigate = jest.fn();
    render(<MockPathwayBreadcrumbs view="pathway" onNavigate={onNavigate} />);
    expect(screen.getByText('Pathway')).toBeInTheDocument();
    await user.click(screen.getByText('Career profile'));
    expect(onNavigate).toHaveBeenCalledWith('profile');
  });

  it('omitting flowVariant still renders the three-step career trail', () => {
    render(<MockPathwayBreadcrumbs view="pathway" />);
    expect(screen.getByText('Career profile')).toBeInTheDocument();
  });

  describe('skills flow', () => {
    it('view="pathway" shows only the Onboarding-quiz link and the Pathway active label, with no Career-profile link', async () => {
      const user = userEvent.setup();
      const onNavigate = jest.fn();
      render(<MockPathwayBreadcrumbs view="pathway" onNavigate={onNavigate} flowVariant="skills" />);

      expect(screen.getByText('Pathway')).toBeInTheDocument();
      expect(screen.queryByText('Career profile')).not.toBeInTheDocument();

      await user.click(screen.getByText('Onboarding quiz'));
      expect(onNavigate).toHaveBeenCalledWith('onboarding');
    });

    it('view="onboarding" renders no links', () => {
      render(<MockPathwayBreadcrumbs view="onboarding" flowVariant="skills" />);
      expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });
  });
});
