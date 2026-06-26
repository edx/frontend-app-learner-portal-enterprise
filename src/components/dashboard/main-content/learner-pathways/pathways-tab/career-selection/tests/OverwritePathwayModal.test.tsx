import '@testing-library/jest-dom/extend-expect';
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
    expect(screen.queryByText('Overwrite previous pathway?')).not.toBeInTheDocument();
  });

  it('renders modal content when isOpen is true', () => {
    renderModal({ isOpen: true });
    expect(screen.getByText('Overwrite previous pathway?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Keep previous pathway' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Build new pathway' })).toBeInTheDocument();
  });

  it('calls onClose when the keep-pathway button is clicked', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    renderModal({ isOpen: true, onClose });
    await user.click(screen.getByRole('button', { name: 'Keep previous pathway' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onConfirm when the build-new-pathway button is clicked', async () => {
    const user = userEvent.setup();
    const onConfirm = jest.fn().mockResolvedValue(undefined);
    renderModal({ isOpen: true, onConfirm });
    await user.click(screen.getByRole('button', { name: 'Build new pathway' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('disables both action buttons when isBuildingPathway', () => {
    renderModal({ isOpen: true, isBuildingPathway: true });
    expect(screen.getByRole('button', { name: 'Keep previous pathway' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Build new pathway' })).toBeDisabled();
  });
});
