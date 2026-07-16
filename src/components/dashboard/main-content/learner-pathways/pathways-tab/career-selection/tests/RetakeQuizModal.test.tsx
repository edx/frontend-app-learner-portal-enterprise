import '@testing-library/jest-dom/extend-expect';
import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntlProvider } from '@edx/frontend-platform/i18n';

import RetakeQuizModal from '../RetakeQuizModal';

const renderModal = (props: Partial<React.ComponentProps<typeof RetakeQuizModal>> = {}) => render(
  <IntlProvider locale="en">
    <RetakeQuizModal
      isOpen={false}
      onClose={jest.fn()}
      onConfirm={jest.fn()}
      {...props}
    />
  </IntlProvider>,
);

describe('RetakeQuizModal', () => {
  beforeEach(() => jest.clearAllMocks());

  it('does not render modal content when isOpen is false', () => {
    renderModal({ isOpen: false });
    expect(screen.queryByText('Retake your onboarding quiz?')).not.toBeInTheDocument();
  });

  it('renders modal content when isOpen is true', () => {
    renderModal({ isOpen: true });
    expect(screen.getByText('Retake your onboarding quiz?')).toBeInTheDocument();
    expect(screen.getByText(
      "If you retake the onboarding quiz, your existing goal summary, career match, and pathway will no longer be saved. You will need to rebuild them. Your enrolled courses won't be affected.",
    )).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retake quiz' })).toBeInTheDocument();
  });

  it('calls onClose when Cancel is clicked', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    renderModal({ isOpen: true, onClose });
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onConfirm when Retake quiz is clicked', async () => {
    const user = userEvent.setup();
    const onConfirm = jest.fn();
    renderModal({ isOpen: true, onConfirm });
    await user.click(screen.getByRole('button', { name: 'Retake quiz' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('returns focus to the trigger element when the modal closes', () => {
    const triggerRef = createRef<HTMLButtonElement>();
    const { rerender } = render(
      <IntlProvider locale="en">
        <button type="button" ref={triggerRef}>Open</button>
        <RetakeQuizModal
          isOpen
          onClose={jest.fn()}
          onConfirm={jest.fn()}
          triggerRef={triggerRef}
        />
      </IntlProvider>,
    );

    rerender(
      <IntlProvider locale="en">
        <button type="button" ref={triggerRef}>Open</button>
        <RetakeQuizModal
          isOpen={false}
          onClose={jest.fn()}
          onConfirm={jest.fn()}
          triggerRef={triggerRef}
        />
      </IntlProvider>,
    );

    expect(triggerRef.current).toHaveFocus();
  });
});
