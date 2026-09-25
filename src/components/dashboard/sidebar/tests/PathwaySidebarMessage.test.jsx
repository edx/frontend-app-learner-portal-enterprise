import '@testing-library/jest-dom/extend-expect';
import { screen, render } from '@testing-library/react';
import { IntlProvider } from '@edx/frontend-platform/i18n';
import { getConfig } from '@edx/frontend-platform/config';

import PathwaySidebarMessage from '../PathwaySidebarMessage';
import { useEnterpriseCustomer } from '../../../app/data';
import { enterpriseCustomerFactory } from '../../../app/data/services/data/__factories__';

jest.mock('@edx/frontend-platform/config', () => ({
  ...jest.requireActual('@edx/frontend-platform/config'),
  getConfig: jest.fn(),
}));

jest.mock('../../../app/data', () => ({
  ...jest.requireActual('../../../app/data'),
  useEnterpriseCustomer: jest.fn(),
}));

const ALLOWLISTED_UUID = '2e16fcfa-58ea-4021-be51-2235ef4b5284';
const OTHER_UUID = '11111111-1111-1111-1111-111111111111';
const mockEnterpriseCustomer = enterpriseCustomerFactory({ uuid: ALLOWLISTED_UUID });

const PathwaySidebarMessageWrapper = (props) => (
  <IntlProvider locale="en">
    <PathwaySidebarMessage {...props} />
  </IntlProvider>
);

describe('<PathwaySidebarMessage />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getConfig.mockReturnValue({
      FEATURE_ENABLE_PATHWAY_MESSAGE_FOR_ENTERPRISE_CUSTOMER: ALLOWLISTED_UUID,
    });
    useEnterpriseCustomer.mockReturnValue({ data: mockEnterpriseCustomer });
  });

  it('renders the pathway message when the enterprise customer is allowlisted', () => {
    render(<PathwaySidebarMessageWrapper />);
    expect(screen.getByTestId('pathway-sidebar-message')).toBeInTheDocument();
    expect(screen.getByText('Welcome to your pathway')).toBeInTheDocument();
    expect(screen.getByText(
      'You are completing these courses through the Talal Abu-Ghazaleh Global Digital Polytechnic (TAG.GDPT) learning pathway.',
    )).toBeInTheDocument();
    expect(screen.getByAltText('TAG.GDPT and edX')).toBeInTheDocument();
  });

  it('does not render when the enterprise customer is not allowlisted', () => {
    useEnterpriseCustomer.mockReturnValue({ data: { ...mockEnterpriseCustomer, uuid: OTHER_UUID } });
    render(<PathwaySidebarMessageWrapper />);
    expect(screen.queryByTestId('pathway-sidebar-message')).not.toBeInTheDocument();
  });

  it('does not render when the allowed uuid is an empty string', () => {
    getConfig.mockReturnValue({ FEATURE_ENABLE_PATHWAY_MESSAGE_FOR_ENTERPRISE_CUSTOMER: '' });
    render(<PathwaySidebarMessageWrapper />);
    expect(screen.queryByTestId('pathway-sidebar-message')).not.toBeInTheDocument();
  });

  it('does not render when the allowed uuid is null', () => {
    getConfig.mockReturnValue({ FEATURE_ENABLE_PATHWAY_MESSAGE_FOR_ENTERPRISE_CUSTOMER: null });
    render(<PathwaySidebarMessageWrapper />);
    expect(screen.queryByTestId('pathway-sidebar-message')).not.toBeInTheDocument();
  });

  it('defaults to the mb-3 mt-3 className used by the desktop sidebar, and accepts an override', () => {
    const { rerender } = render(<PathwaySidebarMessageWrapper />);
    expect(screen.getByTestId('pathway-sidebar-message')).toHaveClass('mb-3', 'mt-3');

    rerender(<PathwaySidebarMessageWrapper className="" />);
    expect(screen.getByTestId('pathway-sidebar-message')).not.toHaveClass('mb-3', 'mt-3');
  });
});
