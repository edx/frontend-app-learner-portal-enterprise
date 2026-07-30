import { screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import { IntlProvider } from '@edx/frontend-platform/i18n';
import { AppContext } from '@edx/frontend-platform/react';
import { QueryClientProvider } from '@tanstack/react-query';

import DashboardMainContent from './DashboardMainContent';
import { queryClient, renderWithRouter } from '../../../utils/tests';
import {
  useEnterpriseCourseEnrollments,
  useEnterpriseCustomer,
  useAcademies,
  useEnterpriseFeatures,
  useRedeemablePolicies,
  useCanOnlyViewHighlights,
} from '../../app/data';
import {
  authenticatedUserFactory,
  enterpriseCustomerFactory,
  academiesFactory,
} from '../../app/data/services/data/__factories__';

jest.mock('../../app/data', () => ({
  ...jest.requireActual('../../app/data'),
  useAcademies: jest.fn(),
  useEnterpriseCourseEnrollments: jest.fn(),
  useEnterpriseCustomer: jest.fn(),
  useEnterpriseFeatures: jest.fn(),
  useRedeemablePolicies: jest.fn(),
  useCanOnlyViewHighlights: jest.fn(),
}));

const mockAuthenticatedUser = authenticatedUserFactory();
const mockEnterpriseCustomer = enterpriseCustomerFactory();

const DashboardMainContentWrapper = () => (
  <QueryClientProvider client={queryClient()}>
    <IntlProvider locale="en">
      <AppContext.Provider value={{ authenticatedUser: mockAuthenticatedUser }}>
        <DashboardMainContent />
      </AppContext.Provider>
    </IntlProvider>
  </QueryClientProvider>
);

describe('DashboardMainContent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useEnterpriseCustomer.mockReturnValue({ data: mockEnterpriseCustomer });
    useAcademies.mockReturnValue({ data: academiesFactory(3) });
    useEnterpriseFeatures.mockReturnValue({ data: { enterpriseGroupsV1: false } });
    useRedeemablePolicies.mockReturnValue({ data: { redeemablePolicies: [] } });
    useCanOnlyViewHighlights.mockReturnValue({ data: false });
    useEnterpriseCourseEnrollments.mockReturnValue({
      data: {
        allEnrollmentsByStatus: {
          inProgress: [],
          upcoming: [],
          completed: [],
          requested: [],
          savedForLater: [],
          assigned: {
            assignmentsForDisplay: [],
            canceledAssignments: [],
            expiredAssignments: [],
          },
        },
      },
    });
  });
  it('renders the legacy My Courses empty state when there are no enrollments', async () => {
    renderWithRouter(
      <DashboardMainContentWrapper />,
    );
    await waitFor(() => {
      expect(screen.getByText(/Getting started with edX is easy/)).toBeInTheDocument();
    });
  });

  it('Displays disableSearch flag message', () => {
    const mockEnterpriseCustomerWithDisabledSearch = enterpriseCustomerFactory({ disable_search: true });
    useEnterpriseCustomer.mockReturnValue({ data: mockEnterpriseCustomerWithDisabledSearch });
    renderWithRouter(
      <DashboardMainContentWrapper />,
    );
    expect(screen.getByText('Reach out to your administrator for instructions on how to start learning with edX!', { exact: false })).toBeInTheDocument();
  });
});
