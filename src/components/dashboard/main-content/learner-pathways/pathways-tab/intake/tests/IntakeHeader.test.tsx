import '@testing-library/jest-dom/extend-expect';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { IntlProvider } from '@edx/frontend-platform/i18n';
import IntakeHeader from '../IntakeHeader';
import messages from '../messages';

const MockIntakeHeader = () => (
  <IntlProvider locale="en">
    <IntakeHeader />
  </IntlProvider>
);

describe('IntakeHeader', () => {
  it('renders translated heading, helper text, and privacy trigger', () => {
    render(<MockIntakeHeader />);

    expect(screen.getByRole('heading', { name: messages.heading.defaultMessage })).toBeInTheDocument();
    expect(screen.getByText(messages.helperText.defaultMessage)).toBeInTheDocument();
    expect(screen.getByLabelText(messages.privacyTriggerLabel.defaultMessage)).toBeInTheDocument();
  });
});
