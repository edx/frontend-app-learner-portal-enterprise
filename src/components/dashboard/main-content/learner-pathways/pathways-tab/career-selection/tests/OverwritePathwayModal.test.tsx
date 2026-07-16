import '@testing-library/jest-dom/extend-expect';
import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntlProvider } from '@edx/frontend-platform/i18n';

import OverwritePathwayModal from '../OverwritePathwayModal';

const renderModal = (props: Partial<React.ComponentProps<typeof OverwritePathwayModal>> = {}) => render(
  <IntlProvider locale="en">
    <OverwritePathwayModal
      isOpen={false}
      onClose={jest.fn()}
      onConfirm={jest.fn().mockResolvedValue(undefined)}
      {...props}
    />
  </IntlProvider>,
);

describe('OverwritePathwayModal', () => {
  beforeEach(() => jest.clearAllMocks());

  it('does not render modal content when isOpen is false', () => {
    renderModal({ isOpen: false });
    expect(screen.queryByText('Rebuild your Pathway?')).not.toBeInTheDocument();
  });

  it('renders modal content when isOpen is true', () => {
    renderModal({ isOpen: true });
    expect(screen.getByText('Rebuild your Pathway?')).toBeInTheDocument();
    expect(screen.getByText('Your current pathway will be replaced with new recommendations.')).toBeInTheDocument();
    expect(screen.getByText(
      "Any courses you've already enrolled in won't be affected. You will still be able to access them on the course tab on your dashboard.",
    )).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Rebuild Pathway' })).toBeInTheDocument();
  });

  it('calls onClose when Cancel is clicked', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    renderModal({ isOpen: true, onClose });
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onConfirm when Rebuild Pathway is clicked', async () => {
    const user = userEvent.setup();
    const onConfirm = jest.fn().mockResolvedValue(undefined);
    renderModal({ isOpen: true, onConfirm });
    await user.click(screen.getByRole('button', { name: 'Rebuild Pathway' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('does not throw an unhandled rejection when onConfirm rejects', async () => {
    const user = userEvent.setup();
    const onConfirm = jest.fn().mockRejectedValue(new Error('build failed'));
    renderModal({ isOpen: true, onConfirm });
    await user.click(screen.getByRole('button', { name: 'Rebuild Pathway' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Rebuild your Pathway?')).toBeInTheDocument();
  });

  it('disables both action buttons when isBuildingPathway', () => {
    renderModal({ isOpen: true, isBuildingPathway: true });
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Rebuild Pathway' })).toBeDisabled();
  });

  it('returns focus to the trigger element when the modal closes', () => {
    const triggerRef = createRef<HTMLButtonElement>();
    const { rerender } = render(
      <IntlProvider locale="en">
        <button type="button" ref={triggerRef}>Open</button>
        <OverwritePathwayModal
          isOpen
          onClose={jest.fn()}
          onConfirm={jest.fn().mockResolvedValue(undefined)}
          triggerRef={triggerRef}
        />
      </IntlProvider>,
    );

    rerender(
      <IntlProvider locale="en">
        <button type="button" ref={triggerRef}>Open</button>
        <OverwritePathwayModal
          isOpen={false}
          onClose={jest.fn()}
          onConfirm={jest.fn().mockResolvedValue(undefined)}
          triggerRef={triggerRef}
        />
      </IntlProvider>,
    );

    expect(triggerRef.current).toHaveFocus();
  });
});
