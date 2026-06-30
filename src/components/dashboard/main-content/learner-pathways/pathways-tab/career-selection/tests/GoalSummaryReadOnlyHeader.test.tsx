import '@testing-library/jest-dom/extend-expect';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntlProvider } from '@edx/frontend-platform/i18n';

import GoalSummaryReadOnlyHeader from '../GoalSummaryReadOnlyHeader';

const renderHeader = (onBeginEditing = jest.fn()) => render(
  <IntlProvider locale="en">
    <GoalSummaryReadOnlyHeader onBeginEditing={onBeginEditing} />
  </IntlProvider>,
);

describe('GoalSummaryReadOnlyHeader', () => {
  it('renders the Goal Summary title', () => {
    renderHeader();
    expect(screen.getByRole('heading', { name: 'Goal Summary' })).toBeInTheDocument();
  });

  it('renders the edit button with the correct test id', () => {
    renderHeader();
    expect(screen.getByTestId('goal-summary-edit-button')).toBeInTheDocument();
  });

  it('edit button is labeled Edit', () => {
    renderHeader();
    expect(screen.getByTestId('goal-summary-edit-button')).toHaveTextContent('Edit');
  });

  it('calls onBeginEditing when the edit button is clicked', async () => {
    const user = userEvent.setup();
    const onBeginEditing = jest.fn();
    renderHeader(onBeginEditing);
    await user.click(screen.getByTestId('goal-summary-edit-button'));
    expect(onBeginEditing).toHaveBeenCalledTimes(1);
  });
});
