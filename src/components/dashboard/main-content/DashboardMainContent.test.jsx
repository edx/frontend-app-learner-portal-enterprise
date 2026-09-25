import { screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import { breakpoints } from '@openedx/paragon';
import { IntlProvider } from '@edx/frontend-platform/i18n';
import { AppContext } from '@edx/frontend-platform/react';
import { getConfig } from '@edx/frontend-platform/config';
import { QueryClientProvider } from '@tanstack/react-query';

import DashboardMainContent from './DashboardMainContent';
import { queryClient, renderWithRouter } from '../../../utils/tests';
import {
  useEnterpriseCourseEnrollments,
  useEnterpriseCustomer,
  useAcademies,
  useCanViewAcademies,
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
  useCanViewAcademies: jest.fn(),
  useEnterpriseCourseEnrollments: jest.fn(),
  useEnterpriseCustomer: jest.fn(),
  useEnterpriseFeatures: jest.fn(),
  useRedeemablePolicies: jest.fn(),
  useCanOnlyViewHighlights: jest.fn(),
}));

jest.mock('@edx/frontend-platform/config', () => ({
  ...jest.requireActual('@edx/frontend-platform/config'),
  getConfig: jest.fn(),
}));

// SubsidiesSummary is unrelated to what's under test here (mobile MediaQuery composition)
// and pulls in several hooks (useCouponCodes, useEnterpriseOffers, useBrowseAndRequest, etc.)
// this file doesn't mock; it only ever mounted at desktop width before this suite exercised
// the mobile branch, so those hooks were never previously exercised here either.
jest.mock('../sidebar/SubsidiesSummary', () => () => null);

const mockDesktopWindowConfig = { type: 'screen', width: breakpoints.large.minWidth + 1, height: 800 };
const mockMobileWindowConfig = { type: 'screen', width: breakpoints.medium.maxWidth - 1, height: 800 };

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
    window.matchMedia.setConfig(mockDesktopWindowConfig);
    getConfig.mockReturnValue({ FEATURE_ENABLE_PATHWAY_MESSAGE_FOR_ENTERPRISE_CUSTOMER: null });
    useEnterpriseCustomer.mockReturnValue({ data: mockEnterpriseCustomer });
    useAcademies.mockReturnValue({ data: academiesFactory(3) });
    useCanViewAcademies.mockReturnValue(false);
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

  describe('on mobile/tablet viewports', () => {
    afterEach(() => {
      window.matchMedia.setConfig(mockDesktopWindowConfig);
    });

    it('renders the backend-driven learner portal sidebar message', async () => {
      window.matchMedia.setConfig(mockMobileWindowConfig);
      useEnterpriseCustomer.mockReturnValue({
        data: {
          ...mockEnterpriseCustomer,
          enableLearnerPortalSidebarMessage: true,
          learnerPortalSidebarContent: '<p>Custom backend-driven message</p>',
        },
      });
      renderWithRouter(<DashboardMainContentWrapper />);
      await waitFor(() => {
        expect(screen.getByTestId('learner-portal-sidebar-message')).toBeInTheDocument();
      });
      expect(screen.getByText('Custom backend-driven message')).toBeInTheDocument();
    });

    it('renders the pathway sidebar message for an allowlisted customer', async () => {
      window.matchMedia.setConfig(mockMobileWindowConfig);
      getConfig.mockReturnValue({
        FEATURE_ENABLE_PATHWAY_MESSAGE_FOR_ENTERPRISE_CUSTOMER: mockEnterpriseCustomer.uuid,
      });
      renderWithRouter(<DashboardMainContentWrapper />);
      await waitFor(() => {
        expect(screen.getByTestId('pathway-sidebar-message')).toBeInTheDocument();
      });
      expect(screen.getByText('Welcome to your pathway')).toBeInTheDocument();
    });

    it('still renders the Need help block alongside the sidebar messages', async () => {
      window.matchMedia.setConfig(mockMobileWindowConfig);
      renderWithRouter(<DashboardMainContentWrapper />);
      await waitFor(() => {
        expect(screen.getByText('Need help?')).toBeInTheDocument();
      });
    });
  });
});
