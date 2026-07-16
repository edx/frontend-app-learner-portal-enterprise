import '@testing-library/jest-dom/extend-expect';
import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntlProvider } from '@edx/frontend-platform/i18n';

import NoPathwayCoursesModal from '../NoPathwayCoursesModal';

const renderModal = (props: Partial<React.ComponentProps<typeof NoPathwayCoursesModal>> = {}) => render(
  <IntlProvider locale="en">
    <NoPathwayCoursesModal
      isOpen={false}
      onClose={jest.fn()}
      onEditGoalSummary={jest.fn()}
      {...props}
    />
  </IntlProvider>,
);

describe('NoPathwayCoursesModal', () => {
  beforeEach(() => jest.clearAllMocks());

  it('does not render modal content when isOpen is false', () => {
    renderModal({ isOpen: false });
    expect(screen.queryByText('We could not build a pathway for this career match')).not.toBeInTheDocument();
  });

  it('renders the title, body, icon, and both actions when isOpen is true', () => {
    renderModal({ isOpen: true });
    expect(screen.getByText('We could not build a pathway for this career match')).toBeInTheDocument();
    expect(screen.getByText(
      "There aren't enough courses available for this career goal right now. Try selecting a different career match, or edit your goal summary to explore other directions.",
    )).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Choose a different match' })).toBeInTheDocument();

    // The icon is decorative only — it must not add its own accessible name/role.
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('calls onClose when Back is clicked without modifying anything else', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    const onEditGoalSummary = jest.fn();
    renderModal({ isOpen: true, onClose, onEditGoalSummary });
    await user.click(screen.getByRole('button', { name: 'Back' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onEditGoalSummary).not.toHaveBeenCalled();
  });

  it('calls onEditGoalSummary when Choose a different match is clicked', async () => {
    const user = userEvent.setup();
    const onEditGoalSummary = jest.fn();
    renderModal({ isOpen: true, onEditGoalSummary });
    await user.click(screen.getByRole('button', { name: 'Choose a different match' }));
    expect(onEditGoalSummary).toHaveBeenCalledTimes(1);
  });

  it('returns focus to the trigger element when the modal closes', () => {
    const triggerRef = createRef<HTMLButtonElement>();
    const { rerender } = render(
      <IntlProvider locale="en">
        <button type="button" ref={triggerRef}>Open</button>
        <NoPathwayCoursesModal
          isOpen
          onClose={jest.fn()}
          onEditGoalSummary={jest.fn()}
          triggerRef={triggerRef}
        />
      </IntlProvider>,
    );

    rerender(
      <IntlProvider locale="en">
        <button type="button" ref={triggerRef}>Open</button>
        <NoPathwayCoursesModal
          isOpen={false}
          onClose={jest.fn()}
          onEditGoalSummary={jest.fn()}
          triggerRef={triggerRef}
        />
      </IntlProvider>,
    );

    expect(triggerRef.current).toHaveFocus();
  });
});
