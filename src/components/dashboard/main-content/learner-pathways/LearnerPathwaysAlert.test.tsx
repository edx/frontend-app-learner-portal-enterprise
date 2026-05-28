import '@testing-library/jest-dom/extend-expect';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider } from '@tanstack/react-query';
import { IntlProvider } from '@edx/frontend-platform/i18n';

import { queryClient } from '../../../../utils/tests';
import {
  DASHBOARD_AI_PATHWAYS_TAB,
  DASHBOARD_PATHWAYS_TAB,
} from '../../data/constants';
import LearnerPathwaysAlert from './LearnerPathwaysAlert';

const defaultProps = {
  onSelectTab: jest.fn(),
  hasPathwaysTab: true,
  hasAIPathwaysTab: false,
};

const renderComponent = (props = {}) => render(
  <QueryClientProvider client={queryClient()}>
    <IntlProvider locale="en">
      <LearnerPathwaysAlert
        {...defaultProps}
        {...props}
      />
    </IntlProvider>
  </QueryClientProvider>,
);

describe('LearnerPathwaysAlert', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders default not started scaffold state', () => {
    renderComponent();
    expect(screen.getByText('Ready to start your learning journey?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start pathway onboarding' })).toBeInTheDocument();
  });

  it('renders a provided scaffold state variant', () => {
    renderComponent({ initialState: 'completed' });
    expect(screen.getByText('Your learning pathway is complete!')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start a new pathway' })).toBeInTheDocument();
  });

  it('renders dynamic progress values for active and completed states', () => {
    const { rerender } = render(
      <QueryClientProvider client={queryClient()}>
        <IntlProvider locale="en">
          <LearnerPathwaysAlert
            {...defaultProps}
            initialState="active_zero_started"
            progressCounts={{ startedCount: 3, completedCount: 1, totalCount: 8 }}
          />
        </IntlProvider>
      </QueryClientProvider>,
    );
    expect(screen.getByText('Your learning pathway progress: 3/8 courses started')).toBeInTheDocument();

    rerender(
      <QueryClientProvider client={queryClient()}>
        <IntlProvider locale="en">
          <LearnerPathwaysAlert
            {...defaultProps}
            initialState="completed"
            progressCounts={{ startedCount: 8, completedCount: 8, totalCount: 8 }}
          />
        </IntlProvider>
      </QueryClientProvider>,
    );
    expect(screen.getByText('Progress: 8/8 courses completed')).toBeInTheDocument();
  });

  it('disables actions when pathways tabs are unavailable', () => {
    renderComponent({ hasPathwaysTab: false, hasAIPathwaysTab: false });
    expect(screen.getByRole('button', { name: 'Start pathway onboarding' })).toBeDisabled();
  });

  it('uses AI pathways tab when both destinations are available', async () => {
    const user = userEvent.setup();
    const onSelectTab = jest.fn();
    renderComponent({ onSelectTab, hasPathwaysTab: true, hasAIPathwaysTab: true });
    await user.click(screen.getByRole('button', { name: 'Start pathway onboarding' }));
    expect(onSelectTab).toHaveBeenCalledWith(DASHBOARD_AI_PATHWAYS_TAB);
  });

  it('uses pathways tab when AI pathways tab is unavailable', async () => {
    const user = userEvent.setup();
    const onSelectTab = jest.fn();
    renderComponent({ onSelectTab, hasPathwaysTab: true, hasAIPathwaysTab: false });
    await user.click(screen.getByRole('button', { name: 'Start pathway onboarding' }));
    expect(onSelectTab).toHaveBeenCalledWith(DASHBOARD_PATHWAYS_TAB);
  });
});
