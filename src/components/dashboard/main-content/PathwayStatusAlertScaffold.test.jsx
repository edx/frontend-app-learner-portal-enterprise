import '@testing-library/jest-dom/extend-expect';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntlProvider } from '@edx/frontend-platform/i18n';

import { renderWithRouter } from '../../../utils/tests';
import PathwayStatusAlertScaffold from './PathwayStatusAlertScaffold';

const renderPathwayStatusAlertScaffold = (props = {}) => renderWithRouter(
  <IntlProvider locale="en">
    <PathwayStatusAlertScaffold onOpenPathwaysTab={jest.fn()} {...props} />
  </IntlProvider>,
);

describe('PathwayStatusAlertScaffold', () => {
  it('renders v0 scaffold content', () => {
    renderPathwayStatusAlertScaffold();
    expect(screen.getByTestId('pathway-status-alert-scaffold')).toBeInTheDocument();
    expect(screen.getByText('Pathway status update')).toBeInTheDocument();
    expect(
      screen.getByText('Pathway status details will appear here once BFF-backed states are connected.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open Pathways tab' })).toBeInTheDocument();
  });

  it('opens the pathways tab when action button is clicked', async () => {
    const user = userEvent.setup();
    const onOpenPathwaysTab = jest.fn();
    renderPathwayStatusAlertScaffold({ onOpenPathwaysTab });
    await user.click(screen.getByRole('button', { name: 'Open Pathways tab' }));
    expect(onOpenPathwaysTab).toHaveBeenCalledTimes(1);
  });
});
