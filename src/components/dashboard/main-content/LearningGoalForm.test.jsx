import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/extend-expect';
import { IntlProvider } from '@edx/frontend-platform/i18n';
import { sendEnterpriseTrackEvent } from '@2uinc/frontend-enterprise-utils';

import LearningGoalForm from './LearningGoalForm';
import { useEnterpriseCustomer } from '../../app/data';
import { saveWeeklyLearningGoal } from './data/learningGoalService';
import { queryClient } from '../../../utils/tests';
import { enterpriseCustomerFactory } from '../../app/data/services/data/__factories__';

jest.mock('../../app/data', () => ({
  ...jest.requireActual('../../app/data'),
  useEnterpriseCustomer: jest.fn(),
}));
jest.mock('./data/learningGoalService');
jest.mock('@2uinc/frontend-enterprise-utils');

const mockEnterpriseCustomer = enterpriseCustomerFactory();

const LearningGoalFormWrapper = () => (
  <QueryClientProvider client={queryClient()}>
    <IntlProvider locale="en">
      <LearningGoalForm />
    </IntlProvider>
  </QueryClientProvider>
);

describe('<LearningGoalForm />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useEnterpriseCustomer.mockReturnValue({ data: mockEnterpriseCustomer });
  });

  it('renders an input with an accessible, correctly associated label', () => {
    render(<LearningGoalFormWrapper />);
    const input = screen.getByLabelText('Weekly learning goal (hours)');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('type', 'number');
  });

  it('shows the pending state and disables the button while saving', async () => {
    const user = userEvent.setup();
    let resolveSave;
    saveWeeklyLearningGoal.mockImplementation(
      () => new Promise((resolve) => { resolveSave = resolve; }),
    );
    render(<LearningGoalFormWrapper />);

    await user.type(screen.getByLabelText('Weekly learning goal (hours)'), '5');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    const pendingBtn = screen.getByRole('button', { name: 'Saving' });
    expect(pendingBtn).toHaveAttribute('aria-disabled', 'true');

    resolveSave({ goalHours: '5' });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Saved' })).toBeInTheDocument());
  });

  it('shows a non-color-only success confirmation and fires the segment event on save', async () => {
    const user = userEvent.setup();
    saveWeeklyLearningGoal.mockResolvedValueOnce({ goalHours: '5' });
    render(<LearningGoalFormWrapper />);

    await user.type(screen.getByLabelText('Weekly learning goal (hours)'), '5');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    const confirmation = await screen.findByRole('alert');
    expect(confirmation).toHaveTextContent('Your weekly learning goal has been saved.');
    expect(confirmation.closest('[aria-live="polite"]')).toBeInTheDocument();

    expect(sendEnterpriseTrackEvent).toHaveBeenCalledTimes(1);
    expect(sendEnterpriseTrackEvent).toHaveBeenCalledWith(
      mockEnterpriseCustomer.uuid,
      'edx.ui.enterprise.learner_portal.dashboard.learning_goal.saved',
      { goal_hours: '5' },
    );
  });

  it('shows an error state on the button when the save fails', async () => {
    const user = userEvent.setup();
    saveWeeklyLearningGoal.mockRejectedValueOnce(new Error('failed to save'));
    render(<LearningGoalFormWrapper />);

    await user.click(screen.getByRole('button', { name: 'Save' }));

    const errorBtn = await screen.findByRole('button', { name: 'Try again' });
    expect(errorBtn).toBeInTheDocument();
    expect(sendEnterpriseTrackEvent).not.toHaveBeenCalled();
  });
});
