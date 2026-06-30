import '@testing-library/jest-dom/extend-expect';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntlProvider } from '@edx/frontend-platform/i18n';

import GoalSummaryEditHeader from '../GoalSummaryEditHeader';

const renderHeader = (overrides = {}) => {
  const props = {
    isProfileSubmitting: false,
    isDirty: false,
    isValid: true,
    onCancel: jest.fn(),
    ...overrides,
  };
  return render(
    <IntlProvider locale="en">
      <form>
        <GoalSummaryEditHeader {...props} />
      </form>
    </IntlProvider>,
  );
};

describe('GoalSummaryEditHeader', () => {
  it('renders the Goal Summary title', () => {
    renderHeader();
    expect(screen.getByRole('heading', { name: 'Goal Summary' })).toBeInTheDocument();
  });

  it('renders Cancel and Submit buttons', () => {
    renderHeader({ isDirty: true });
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(screen.getByTestId('goal-summary-submit-button')).toBeInTheDocument();
  });

  it('submit button is disabled when form is not dirty', () => {
    renderHeader({ isDirty: false, isValid: true });
    expect(screen.getByTestId('goal-summary-submit-button')).toBeDisabled();
  });

  it('submit button is disabled when form is invalid', () => {
    renderHeader({ isDirty: true, isValid: false });
    expect(screen.getByTestId('goal-summary-submit-button')).toBeDisabled();
  });

  it('submit button is disabled when isProfileSubmitting', () => {
    renderHeader({ isDirty: true, isValid: true, isProfileSubmitting: true });
    expect(screen.getByTestId('goal-summary-submit-button')).toBeDisabled();
  });

  it('submit button is enabled when dirty, valid, and not submitting', () => {
    renderHeader({ isDirty: true, isValid: true, isProfileSubmitting: false });
    expect(screen.getByTestId('goal-summary-submit-button')).not.toBeDisabled();
  });

  it('shows Submitting... text and spinner when isProfileSubmitting', () => {
    renderHeader({ isProfileSubmitting: true, isDirty: true, isValid: true });
    expect(screen.getByTestId('goal-summary-submit-button')).toHaveTextContent('Submitting...');
  });

  it('cancel button is disabled when isProfileSubmitting', () => {
    renderHeader({ isProfileSubmitting: true });
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
  });

  it('calls onCancel when Cancel is clicked', async () => {
    const user = userEvent.setup();
    const onCancel = jest.fn();
    renderHeader({ onCancel });
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
