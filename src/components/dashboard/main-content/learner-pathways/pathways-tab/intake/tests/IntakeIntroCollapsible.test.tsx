import '@testing-library/jest-dom/extend-expect';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntlProvider } from '@edx/frontend-platform/i18n';
import IntakeIntroCollapsible from '../IntakeIntroCollapsible';
import messages from '../messages';

const MockIntakeIntroCollapsible = () => (
  <IntlProvider locale="en">
    <IntakeIntroCollapsible />
  </IntlProvider>
);

describe('IntakeIntroCollapsible', () => {
  it('expands and collapses translated intro content', async () => {
    const user = userEvent.setup();
    render(<MockIntakeIntroCollapsible />);

    const toggle = screen.getByRole('button', { name: messages.introCollapsibleTitle.defaultMessage });

    if (toggle.getAttribute('aria-expanded') !== 'true') {
      await user.click(toggle);
    }
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText(messages.introStepOneBody.defaultMessage)).toBeInTheDocument();

    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });
});
