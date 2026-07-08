import '@testing-library/jest-dom/extend-expect';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntlProvider } from '@edx/frontend-platform/i18n';

import type { CareerMatch } from '../../state';
import BuildPathwayFooter from '../BuildPathwayFooter';

const testCareer: CareerMatch = {
  id: 'analyst',
  title: 'Data Analyst',
  matchPercentage: 90,
};

const renderFooter = (props: Partial<React.ComponentProps<typeof BuildPathwayFooter>> = {}) => render(
  <IntlProvider locale="en">
    <BuildPathwayFooter
      selectedCareer={testCareer}
      onBuildPathway={jest.fn().mockResolvedValue(undefined)}
      onOpenOverwrite={jest.fn()}
      {...props}
    />
  </IntlProvider>,
);

describe('BuildPathwayFooter', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders the sticky footer with the build pathway CTA', () => {
    renderFooter();
    expect(screen.getByTestId('career-selection-sticky-footer')).toBeInTheDocument();
    expect(screen.getByTestId('profile-build-pathway-button')).toBeInTheDocument();
  });

  it('disables the CTA when no career is selected', () => {
    renderFooter({ selectedCareer: null });
    expect(screen.getByTestId('profile-build-pathway-button')).toBeDisabled();
  });

  it('disables the CTA when isBuildingPathway', () => {
    renderFooter({ isBuildingPathway: true });
    expect(screen.getByTestId('profile-build-pathway-button')).toBeDisabled();
  });

  it('disables the CTA when isCareerMatchesLoading', () => {
    renderFooter({ isCareerMatchesLoading: true });
    expect(screen.getByTestId('profile-build-pathway-button')).toBeDisabled();
  });

  it('calls onBuildPathway when clicked and there is no existing pathway', async () => {
    const user = userEvent.setup();
    const onBuildPathway = jest.fn().mockResolvedValue(undefined);
    renderFooter({ hasExistingPathway: false, onBuildPathway });
    await user.click(screen.getByTestId('profile-build-pathway-button'));
    expect(onBuildPathway).toHaveBeenCalledTimes(1);
  });

  it('calls onOpenOverwrite instead of onBuildPathway when hasExistingPathway', async () => {
    const user = userEvent.setup();
    const onBuildPathway = jest.fn();
    const onOpenOverwrite = jest.fn();
    renderFooter({ hasExistingPathway: true, onBuildPathway, onOpenOverwrite });
    await user.click(screen.getByTestId('profile-build-pathway-button'));
    expect(onOpenOverwrite).toHaveBeenCalledTimes(1);
    expect(onBuildPathway).not.toHaveBeenCalled();
  });

  it('does not throw an unhandled rejection when onBuildPathway rejects', async () => {
    const user = userEvent.setup();
    const onBuildPathway = jest.fn().mockRejectedValue(new Error('build failed'));
    renderFooter({ hasExistingPathway: false, onBuildPathway });
    await user.click(screen.getByTestId('profile-build-pathway-button'));
    expect(onBuildPathway).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('career-selection-sticky-footer')).toBeInTheDocument();
  });

  it('shows building spinner and updated label when isBuildingPathway', () => {
    renderFooter({ isBuildingPathway: true });
    expect(screen.getByTestId('profile-build-pathway-button')).toHaveTextContent('Building pathway...');
  });
});
