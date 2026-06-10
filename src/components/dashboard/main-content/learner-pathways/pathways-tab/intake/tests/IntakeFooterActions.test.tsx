import '@testing-library/jest-dom/extend-expect';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntlProvider } from '@edx/frontend-platform/i18n';
import IntakeFooterActions from '../IntakeFooterActions';
import messages from '../messages';

const MockIntakeFooterActions = ({ onSkip }: { onSkip?: () => void; }) => (
  <IntlProvider locale="en">
    <IntakeFooterActions onSkip={onSkip} />
  </IntlProvider>
);

describe('IntakeFooterActions', () => {
  it('renders submit and skip buttons when skip callback is provided', () => {
    render(<MockIntakeFooterActions onSkip={jest.fn()} />);

    expect(screen.getByRole('button', { name: messages.submitAndReviewProfile.defaultMessage })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: messages.skipToDashboard.defaultMessage })).toBeInTheDocument();
  });

  it('renders only submit when skip callback is not provided', () => {
    render(<MockIntakeFooterActions />);

    expect(screen.getByRole('button', { name: messages.submitAndReviewProfile.defaultMessage })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: messages.skipToDashboard.defaultMessage })).not.toBeInTheDocument();
  });

  it('calls onSkip when skip button is clicked', async () => {
    const user = userEvent.setup();
    const onSkip = jest.fn();
    render(<MockIntakeFooterActions onSkip={onSkip} />);

    await user.click(screen.getByRole('button', { name: messages.skipToDashboard.defaultMessage }));
    expect(onSkip).toHaveBeenCalledTimes(1);
  });
});
