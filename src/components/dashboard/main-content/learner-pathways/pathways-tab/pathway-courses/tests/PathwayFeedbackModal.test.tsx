import '@testing-library/jest-dom/extend-expect';
import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntlProvider } from '@edx/frontend-platform/i18n';

import PathwayFeedbackModal from '../PathwayFeedbackModal';

const FEEDBACK_FORM_URL = 'https://docs.google.com/forms/d/e/mock-form/viewform';

const renderModal = (props: Partial<React.ComponentProps<typeof PathwayFeedbackModal>> = {}) => render(
  <IntlProvider locale="en">
    <PathwayFeedbackModal
      isOpen={false}
      onClose={jest.fn()}
      onGiveFeedback={jest.fn()}
      feedbackFormUrl={FEEDBACK_FORM_URL}
      {...props}
    />
  </IntlProvider>,
);

describe('PathwayFeedbackModal', () => {
  beforeEach(() => jest.clearAllMocks());

  it('does not render modal content when isOpen is false', () => {
    renderModal({ isOpen: false });
    expect(screen.queryByText('Help us improve learning pathways!')).not.toBeInTheDocument();
  });

  it('renders the exact localized title, body, supporting copy, and actions when open', () => {
    renderModal({ isOpen: true });
    expect(screen.getByText('Help us improve learning pathways!')).toBeInTheDocument();
    expect(screen.getByText(
      'We’re actively iterating on this new experience. Tell us what you think of the overall feature and the quality of your AI recommendations.',
    )).toBeInTheDocument();
    expect(screen.getByText(
      'Want to explore your courses first? You can always access this form later via the footer link.',
    )).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Maybe later' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Give feedback/ })).toBeInTheDocument();
  });

  it('calls onClose when Maybe later is clicked', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    renderModal({ isOpen: true, onClose });
    await user.click(screen.getByRole('button', { name: 'Maybe later' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose on Escape/supported dismiss behavior', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    renderModal({ isOpen: true, onClose });
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('points the primary action at the exact configured Google Form URL and opens it securely in a new tab', () => {
    renderModal({ isOpen: true, feedbackFormUrl: FEEDBACK_FORM_URL });
    const link = screen.getByRole('link', { name: /Give feedback/ });
    expect(link).toHaveAttribute('href', FEEDBACK_FORM_URL);
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
    expect(link).toHaveAttribute('rel', expect.stringContaining('noreferrer'));
  });

  it('calls onGiveFeedback when the primary action is clicked', async () => {
    const user = userEvent.setup();
    const onGiveFeedback = jest.fn();
    renderModal({ isOpen: true, onGiveFeedback });
    await user.click(screen.getByRole('link', { name: /Give feedback/ }));
    expect(onGiveFeedback).toHaveBeenCalledTimes(1);
  });

  it('renders the external-link icon without polluting the accessible name', () => {
    renderModal({ isOpen: true });
    const link = screen.getByRole('link', { name: 'Give feedback (opens in a new tab)' });
    expect(link).toBeInTheDocument();
  });

  it('returns focus to the trigger element when a manually opened modal closes', () => {
    const triggerRef = createRef<HTMLButtonElement>();
    const { rerender } = render(
      <IntlProvider locale="en">
        <button type="button" ref={triggerRef}>Open</button>
        <PathwayFeedbackModal
          isOpen
          onClose={jest.fn()}
          onGiveFeedback={jest.fn()}
          feedbackFormUrl={FEEDBACK_FORM_URL}
          triggerRef={triggerRef}
        />
      </IntlProvider>,
    );

    rerender(
      <IntlProvider locale="en">
        <button type="button" ref={triggerRef}>Open</button>
        <PathwayFeedbackModal
          isOpen={false}
          onClose={jest.fn()}
          onGiveFeedback={jest.fn()}
          feedbackFormUrl={FEEDBACK_FORM_URL}
          triggerRef={triggerRef}
        />
      </IntlProvider>,
    );

    expect(triggerRef.current).toHaveFocus();
  });
});
