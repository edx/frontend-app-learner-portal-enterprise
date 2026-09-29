import '@testing-library/jest-dom/extend-expect';
import { AppContext } from '@edx/frontend-platform/react';
import { IntlProvider } from '@edx/frontend-platform/i18n';
import { getConfig } from '@edx/frontend-platform/config';
import { breakpoints } from '@openedx/paragon';
import { screen } from '@testing-library/react';

import { renderWithRouter } from '../../../utils/tests';
import AddJobRole from '../AddJobRole';
import { authenticatedUserFactory, enterpriseCustomerFactory } from '../../app/data/services/data/__factories__';
import { useEnterpriseCourseEnrollments, useEnterpriseCustomer } from '../../app/data';

jest.mock('../../app/data', () => ({
  ...jest.requireActual('../../app/data'),
  useEnterpriseCustomer: jest.fn(),
  useEnterpriseCourseEnrollments: jest.fn(),
}));

jest.mock('@edx/frontend-platform/config', () => ({
  ...jest.requireActual('@edx/frontend-platform/config'),
  getConfig: jest.fn(),
}));

// SubsidiesSummary is unrelated to what's under test here and pulls in several hooks
// (useCouponCodes, useEnterpriseOffers, useBrowseAndRequest, etc.) this file doesn't mock or
// wrap in a QueryClientProvider; it only mounts at desktop width, which this file doesn't
// otherwise exercise.
jest.mock('../../dashboard/sidebar/SubsidiesSummary', () => () => null);

jest.mock('@edx/frontend-platform/i18n', () => ({
  ...jest.requireActual('@edx/frontend-platform/i18n'),
  getLocale: () => 'en',
  getMessages: () => ({}),
}));

// mock useLocation
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useLocation: () => ({
    pathname: '',
    state: {
      activationSuccess: true,
    },
  }),
  useNavigate: () => jest.fn(),
}));

// eslint-disable-next-line no-console
console.error = jest.fn();

const mockAuthenticatedUser = authenticatedUserFactory();

const AddJobRoleWrapper = () => (
  <IntlProvider locale="en">
    <AppContext.Provider value={{ authenticatedUser: mockAuthenticatedUser }}>
      <AddJobRole submitClickHandler={() => jest.fn()} />
    </AppContext.Provider>
  </IntlProvider>
);

const mockEnterpriseCustomer = enterpriseCustomerFactory();
const mockDesktopWindowConfig = { type: 'screen', width: breakpoints.large.minWidth + 1, height: 800 };

describe('<AddJobRole />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getConfig.mockReturnValue({
      LEARNER_SUPPORT_URL: 'https://support.url',
      FEATURE_ENABLE_PATHWAY_MESSAGE_FOR_ENTERPRISE_CUSTOMER: null,
    });
    useEnterpriseCustomer.mockReturnValue({ data: mockEnterpriseCustomer });
    useEnterpriseCourseEnrollments.mockReturnValue({
      data: {
        allEnrollmentsByStatus: {
          inProgress: [{
            courseRunId: 'edx+Demo',
          }],
          upcoming: [],
          completed: [],
          savedForLater: [],
          requested: [],
          assigned: [],
        },
      },
    });
  });
  it('renders the AddJobRole component', () => {
    renderWithRouter(<AddJobRoleWrapper />);
    expect(screen.getAllByText('Add Role')).toBeTruthy();
  });

  it('never renders the dashboard pathway sidebar message, even for an allowlisted customer', () => {
    window.matchMedia.setConfig(mockDesktopWindowConfig);
    getConfig.mockReturnValue({
      LEARNER_SUPPORT_URL: 'https://support.url',
      FEATURE_ENABLE_PATHWAY_MESSAGE_FOR_ENTERPRISE_CUSTOMER: mockEnterpriseCustomer.uuid,
    });
    renderWithRouter(<AddJobRoleWrapper />);
    expect(screen.getByTestId('add-job-role-sidebar')).toBeInTheDocument();
    expect(screen.queryByTestId('pathway-sidebar-message')).not.toBeInTheDocument();
  });
});
