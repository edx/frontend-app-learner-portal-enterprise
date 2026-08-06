import '@testing-library/jest-dom/extend-expect';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntlProvider } from '@edx/frontend-platform/i18n';

import NonProductionBanner from '../NonProductionBanner';
import { getNonProductionBannerDismissalStorageKey } from '../constants';
import { useEnterpriseCustomer } from '../../app/data';
import { enterpriseCustomerFactory } from '../../app/data/services/data/__factories__';

jest.mock('../../app/data', () => ({
  ...jest.requireActual('../../app/data'),
  useEnterpriseCustomer: jest.fn(),
}));

const BANNER_TEXT = 'Non-Production Environment';
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const mockNonProductionCustomer = enterpriseCustomerFactory({ show_non_production_banner: true });
const storageKey = getNonProductionBannerDismissalStorageKey(mockNonProductionCustomer.uuid);

const renderBanner = () => render(
  <IntlProvider locale="en">
    <NonProductionBanner />
  </IntlProvider>,
);

describe('<NonProductionBanner />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.localStorage.clear();
    (useEnterpriseCustomer as jest.Mock).mockReturnValue({ data: mockNonProductionCustomer });
  });

  it('renders for a non-production enterprise customer', () => {
    renderBanner();
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(BANNER_TEXT)).toBeInTheDocument();
  });

  it('does not render when the customer is not a non-production customer', () => {
    (useEnterpriseCustomer as jest.Mock).mockReturnValue({
      data: enterpriseCustomerFactory(),
    });
    renderBanner();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('does not render when the API omits the field', () => {
    const { showNonProductionBanner, ...customerWithoutField } = mockNonProductionCustomer;
    (useEnterpriseCustomer as jest.Mock).mockReturnValue({ data: customerWithoutField });
    renderBanner();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('hides the banner and records the dismissal when dismissed', async () => {
    const user = userEvent.setup();
    renderBanner();

    await user.click(screen.getByRole('button', { name: /dismiss/i }));

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(global.localStorage.getItem(storageKey)).not.toBeNull();
  });

  it('stays hidden when it was dismissed less than 24 hours ago', () => {
    global.localStorage.setItem(storageKey, String(Date.now() - (ONE_DAY_MS - 1000)));
    renderBanner();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('reappears when it was dismissed more than 24 hours ago', () => {
    global.localStorage.setItem(storageKey, String(Date.now() - (ONE_DAY_MS + 1000)));
    renderBanner();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('ignores a dismissal recorded for a different enterprise customer', () => {
    global.localStorage.setItem(
      getNonProductionBannerDismissalStorageKey('some-other-enterprise-id'),
      String(Date.now()),
    );
    renderBanner();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('renders when the stored dismissal timestamp is not parseable', () => {
    global.localStorage.setItem(storageKey, 'not-a-timestamp');
    renderBanner();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('updates dismissal state when enterprise customer changes', async () => {
    const enterprise1 = enterpriseCustomerFactory({ show_non_production_banner: true });
    const enterprise2 = enterpriseCustomerFactory({ show_non_production_banner: true });
    const storageKey1 = getNonProductionBannerDismissalStorageKey(enterprise1.uuid);

    // Setup: dismiss banner for enterprise1
    (useEnterpriseCustomer as jest.Mock).mockReturnValue({ data: enterprise1 });
    const { rerender } = renderBanner();
    expect(screen.getByRole('alert')).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /dismiss/i }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(global.localStorage.getItem(storageKey1)).not.toBeNull();

    // Switch to enterprise2: banner should show since it has a different storageKey
    (useEnterpriseCustomer as jest.Mock).mockReturnValue({ data: enterprise2 });
    rerender(
      <IntlProvider locale="en">
        <NonProductionBanner />
      </IntlProvider>,
    );

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });
});
