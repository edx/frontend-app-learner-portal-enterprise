import '@testing-library/jest-dom/extend-expect';
import {
  screen, waitFor, within,
} from '@testing-library/react';
import { AppContext } from '@edx/frontend-platform/react';
import { IntlProvider } from '@edx/frontend-platform/i18n';
import { breakpoints } from '@openedx/paragon';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider } from '@tanstack/react-query';

import { camelCaseObject } from '@edx/frontend-platform/utils';
import { mergeConfig } from '@edx/frontend-platform';
import dayjs from 'dayjs';
import { NIL as NIL_UUID, v4 as uuidv4 } from 'uuid';
import { sendPageEvent } from '@edx/frontend-platform/analytics';
import { SEEN_SUBSCRIPTION_EXPIRATION_MODAL_COOKIE_PREFIX } from '../../../config/constants';
import { features } from '../../../config';
import { queryClient, renderWithRouter } from '../../../utils/tests';
import DashboardPage from '../DashboardPage';
import {
  EXPIRED_SUBSCRIPTION_MODAL_LOCALSTORAGE_KEY,
  EXPIRING_SUBSCRIPTION_MODAL_LOCALSTORAGE_KEY,
  LICENSE_ACTIVATION_MESSAGE,
} from '../data/constants';
import { LICENSE_STATUS } from '../../enterprise-user-subsidy/data/constants';
import learnerPathwayData from '../../pathway-progress/data/__mocks__/PathwayProgressListData.json';
import {
  emptyRedeemableLearnerCreditPolicies,
  SESSION_STORAGE_KEY_LICENSE_ACTIVATION_MESSAGE,
  useAcademies,
  useBrowseAndRequest,
  useCanOnlyViewHighlights,
  useCouponCodes,
  useEnterpriseCourseEnrollments,
  useEnterpriseCustomer,
  useEnterpriseFeatures,
  useEnterpriseOffers,
  useEnterprisePathwaysList,
  useEnterpriseProgramsList,
  useHasAvailableSubsidiesOrRequests,
  useIsAssignmentsOnlyLearner,
  useRedeemablePolicies,
  useSubscriptions,
} from '../../app/data';
import {
  academiesFactory,
  authenticatedUserFactory,
  enterpriseCustomerFactory,
} from '../../app/data/services/data/__factories__';

const SUBSCRIPTION_EXPIRED_MODAL_TITLE = 'Your subscription has expired';
const SUBSCRIPTION_EXPIRING_MODAL_TITLE = 'Your subscription is expiring';
const dummyProgramData = {
  uuid: 'test-uuid',
  title: 'Test Program Title',
  type: 'MicroMasters',
  bannerImage: {
    large: {
      url: 'www.example.com/large',
      height: 123,
      width: 455,
    },
    medium: {
      url: 'www.example.com/medium',
      height: 123,
      width: 455,
    },
    small: {
      url: 'www.example.com/small',
      height: 123,
      width: 455,
    },
    xSmall: {
      url: 'www.example.com/xSmall',
      height: 123,
      width: 455,
    },
  },
  authoringOrganizations: [
    {
      key: 'test-key',
      logoImageUrl: '/media/organization/logos/shield.png',
    },
  ],
  progress: {
    inProgress: 1,
    completed: 2,
    notStarted: 3,
  },
};

const defaultCouponCodesState = {
  couponCodeAssignments: [],
};

const mockAuthenticatedUser = authenticatedUserFactory();
const mockEnterpriseCustomer = enterpriseCustomerFactory({
  enable_pathways: true,
  enable_programs: true,
});

jest.mock('../../app/data', () => ({
  ...jest.requireActual('../../app/data'),
  useAcademies: jest.fn(),
  useBrowseAndRequest: jest.fn(),
  useCanOnlyViewHighlights: jest.fn(),
  useCouponCodes: jest.fn(),
  useEnterpriseCourseEnrollments: jest.fn(),
  useEnterpriseCustomer: jest.fn(),
  useEnterpriseFeatures: jest.fn(),
  useEnterpriseOffers: jest.fn(),
  useEnterprisePathwaysList: jest.fn(),
  useEnterpriseProgramsList: jest.fn(),
  useHasAvailableSubsidiesOrRequests: jest.fn(),
  useIsAssignmentsOnlyLearner: jest.fn(),
  useRedeemablePolicies: jest.fn(),
  useSubscriptions: jest.fn(),
}));

// usePathwaysController (mounted when the Pathways tab renders) resolves catalog scope
// via useSearchCatalogs/useAlgoliaSearch, and useAlgoliaSearch is backed by a
// Suspense-based BFF query — without a mock, clicking into the Pathways tab suspends
// synchronously and React throws instead of rendering. Stubbed here the same way as
// the other Learner Pathways test files that exercise this hook chain.
jest.mock('../../app/data/hooks', () => ({
  ...jest.requireActual('../../app/data/hooks'),
  useSearchCatalogs: jest.fn(() => []),
  useAlgoliaSearch: jest.fn(() => ({ catalogUuidsToCatalogQueryUuids: {} })),
}));

jest.mock('@edx/frontend-platform/analytics', () => ({
  ...jest.requireActual('@edx/frontend-platform/analytics'),
  sendPageEvent: jest.fn(),
}));

jest.mock('../../../config', () => ({
  features: {
    FEATURE_ENABLE_PATHWAY_PROGRESS: jest.fn(),
    FEATURE_ENABLE_MY_CAREER: jest.fn(),
    FEATURE_ENABLE_TOP_DOWN_ASSIGNMENT: jest.fn(),
  },
}));

const defaultAppState = {
  config: {
    LMS_BASE_URL: process.env.LMS_BASE_URL,
  },
  authenticatedUser: mockAuthenticatedUser,
};

const defaultRedeemablePoliciesState = {
  redeemablePolicies: [{
    learnerContentAssignments: [
      { state: 'allocated' },
    ],
    groupAssociations: ['test-group-association'],
  },
  {
    learnerContentAssignments: [
      { state: 'cancelled' },
    ],
    groupAssociations: ['test-group-association-1'],
  }],
  learnerContentAssignments: {
    ...emptyRedeemableLearnerCreditPolicies.learnerContentAssignments,
    assignments: [{ state: 'allocated' }, { state: 'cancelled' }],
    hasAssignments: true,
    allocatedAssignments: [{ state: 'allocated' }],
    hasAllocatedAssignments: true,
    canceledAssignments: [{ state: 'cancelled' }],
    assignmentsForDisplay: [{ state: 'allocated' }, { state: 'cancelled' }],
    hasAssignmentsForDisplay: true,
  },
};

const mockUseActiveSubsidyOrRequestsData = {
  mockHasAvailableLearnerCreditPolicies: false,
  mockHasAssignedCodesOrCodeRequests: false,
  mockHasActivatedCurrentLicenseOrLicenseRequest: false,
  mockLearnerCreditSummaryCardData: null,
};
const useMockHasAvailableSubsidyOrRequests = ({
  mockHasAvailableLearnerCreditPolicies,
  mockHasAssignedCodesOrCodeRequests,
  mockHasActivatedCurrentLicenseOrLicenseRequest,
  mockLearnerCreditSummaryCardData,
}) => ({
  hasAvailableLearnerCreditPolicies: mockHasAvailableLearnerCreditPolicies,
  hasAssignedCodesOrCodeRequests: mockHasAssignedCodesOrCodeRequests,
  learnerCreditSummaryCardData: mockLearnerCreditSummaryCardData,
  hasActivatedCurrentLicenseOrLicenseRequest: mockHasActivatedCurrentLicenseOrLicenseRequest,
  hasAvailableSubsidyOrRequests: mockHasAssignedCodesOrCodeRequests
    || mockHasActivatedCurrentLicenseOrLicenseRequest
    || mockLearnerCreditSummaryCardData,
});

const mockWindowConfig = {
  type: 'screen',
  width: breakpoints.large.minWidth + 1,
  height: 800,
};

let mockQueryClient;
const DashboardWithContext = ({
  initialAppState = defaultAppState,
}) => {
  mockQueryClient = queryClient();
  return (
    <QueryClientProvider client={mockQueryClient}>
      <IntlProvider locale="en">
        <AppContext.Provider value={initialAppState}>
          <DashboardPage />
        </AppContext.Provider>
      </IntlProvider>
    </QueryClientProvider>
  );
};

jest.mock('plotly.js-dist', () => {});
jest.mock('universal-cookie');

// eslint-disable-next-line no-console
console.error = jest.fn();

describe('<Dashboard />', () => {
  afterAll(() => {
    jest.restoreAllMocks();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Nil-uuid wildcard by default so every existing test below (which never touches this
    // allowlist itself) keeps its current "enabled for all" expectations.
    mergeConfig({ FEATURE_ENABLE_LEARNER_PATHWAYS_FOR_ENTERPRISE_CUSTOMERS: [NIL_UUID] });
    useEnterpriseCustomer.mockReturnValue({ data: mockEnterpriseCustomer });
    useAcademies.mockReturnValue({ data: academiesFactory(3) });
    useEnterpriseFeatures.mockReturnValue({ data: { enterpriseGroupsV1: false } });
    useSubscriptions.mockReturnValue({
      data: {
        subscriptionLicense: undefined,
        subscriptionPlan: undefined,
      },
    });
    useRedeemablePolicies.mockReturnValue({ data: defaultRedeemablePoliciesState });
    useCouponCodes.mockReturnValue({ data: defaultCouponCodesState });
    useEnterpriseOffers.mockReturnValue({ data: { enterpriseOffers: [] } });
    useEnterpriseProgramsList.mockReturnValue({ data: [] });
    useEnterprisePathwaysList.mockReturnValue({ data: [] });
    useEnterpriseCourseEnrollments.mockReturnValue({
      data: {
        allEnrollmentsByStatus: {
          inProgress: [],
          upcoming: [],
          completed: [],
          savedForLater: [],
          requested: [],
          assigned: {
            assignments: [],
            hasAssignments: false,
            allocatedAssignments: [],
            hasAllocatedAssignments: false,
            canceledAssignments: [],
            hasCanceledAssignments: false,
            expiredAssignments: [],
            hasExpiredAssignments: false,
            assignmentsForDisplay: [],
            hasAssignmentsForDisplay: false,
          },
        },
      },
    });
    useCanOnlyViewHighlights.mockReturnValue({ data: false });
    useBrowseAndRequest.mockReturnValue({
      data: {
        requests: {
          subscriptionLicenses: [],
          couponCodes: [],
        },
      },
    });
    useIsAssignmentsOnlyLearner.mockReturnValue(false);
    useHasAvailableSubsidiesOrRequests.mockReturnValue(
      useMockHasAvailableSubsidyOrRequests(mockUseActiveSubsidyOrRequestsData),
    );
  });

  it('renders user first name if available', () => {
    renderWithRouter(<DashboardWithContext />);
    expect(screen.getByText(`Welcome, ${mockAuthenticatedUser.name.split(' ')[0]}!`)).toBeInTheDocument();
  });

  it('does not render user first name if not available', () => {
    const mockAuthenticatedUserWithoutName = authenticatedUserFactory({ name: '' });
    const appState = {
      ...defaultAppState,
      authenticatedUser: mockAuthenticatedUserWithoutName,
    };
    renderWithRouter(<DashboardWithContext initialAppState={appState} />);
    expect(screen.getByText('Welcome!')).toBeInTheDocument();
  });

  it('renders license activation alert on activation success and dismisses it', async () => {
    const user = userEvent.setup();
    sessionStorage.setItem(SESSION_STORAGE_KEY_LICENSE_ACTIVATION_MESSAGE, 'true');
    useSubscriptions.mockReturnValue({
      data: {
        subscriptionLicense: { status: LICENSE_STATUS.ACTIVATED },
        subscriptionPlan: { uuid: 'test-uuid' },
      },
    });
    renderWithRouter(<DashboardWithContext />);
    expect(screen.getByText(LICENSE_ACTIVATION_MESSAGE)).toBeInTheDocument();
    await user.click(screen.getByText('Dismiss'));
    await waitFor(() => expect(screen.queryByText(LICENSE_ACTIVATION_MESSAGE)).toBeFalsy());
    expect(sessionStorage.removeItem).toHaveBeenCalledWith(SESSION_STORAGE_KEY_LICENSE_ACTIVATION_MESSAGE);
  });

  it('does not render license activation alert without activation success', () => {
    renderWithRouter(<DashboardWithContext />);
    expect(screen.queryByText(LICENSE_ACTIVATION_MESSAGE)).toBeFalsy();
  });

  it('renders a courses sidebar on a large screen', async () => {
    window.matchMedia.setConfig(mockWindowConfig);
    renderWithRouter(<DashboardWithContext />);
    expect(screen.getByTestId('courses-tab-sidebar')).toBeInTheDocument();
  });

  it('renders an add job sidebar on a large screen', async () => {
    const user = userEvent.setup();
    features.FEATURE_ENABLE_MY_CAREER.mockImplementation(() => true);
    window.matchMedia.setConfig(mockWindowConfig);
    renderWithRouter(<DashboardWithContext />);
    await user.click(screen.getByText('My Career'));
    await waitFor(() => expect(screen.getByTestId('add-job-role-sidebar')).toBeInTheDocument());
  });

  it('renders pathway tab', async () => {
    const user = userEvent.setup();
    useEnterpriseFeatures.mockReturnValue({ data: { enterpriseAiPathwaysOperatorEnabled: false } });
    useEnterprisePathwaysList.mockReturnValue({ data: camelCaseObject(learnerPathwayData) });
    renderWithRouter(<DashboardWithContext />);
    expect(within(screen.getByRole('tablist')).getByText('Beta')).toBeInTheDocument();
    await user.click(screen.getByText('Pathways'));
    expect(screen.getByTestId('pathway-listing-page')).toBeInTheDocument();
  });

  it('renders learner pathways tab scaffold in pathways tab when Learner Pathways is enabled', async () => {
    const user = userEvent.setup();
    useEnterpriseFeatures.mockReturnValue({ data: { enterpriseAiPathwaysOperatorEnabled: true } });
    useEnterprisePathwaysList.mockReturnValue({ data: camelCaseObject(learnerPathwayData) });
    renderWithRouter(<DashboardWithContext />);
    expect(within(screen.getByRole('tablist')).getByText('Beta')).toBeInTheDocument();

    await user.click(screen.getByText('Pathways'));

    expect(screen.getByTestId('intake-questions-container')).toBeInTheDocument();
  });

  it('renders Pathways tab as disabled and falls back to Courses when Learner Pathways is disabled and there are no existing pathways', () => {
    useEnterpriseFeatures.mockReturnValue({ data: { enterpriseAiPathwaysOperatorEnabled: false } });
    useEnterprisePathwaysList.mockReturnValue({ data: [] });
    renderWithRouter(<DashboardWithContext />);
    const pathwaysTab = screen.getByText('Pathways');
    expect(pathwaysTab).toBeInTheDocument();
    expect(pathwaysTab).toHaveAttribute('aria-disabled', 'true');
    expect(within(screen.getByRole('tablist')).queryByText('Beta')).not.toBeInTheDocument();
    expect(screen.getByText('Courses')).toHaveAttribute('aria-selected', 'true');
  });

  it('does not render Pathways tab or learner pathways alert when customer pathways is disabled, even if Learner Pathways is enabled', () => {
    useEnterpriseCustomer.mockReturnValue({
      data: enterpriseCustomerFactory({ enable_pathways: false, enable_programs: true }),
    });
    useEnterpriseFeatures.mockReturnValue({ data: { enterpriseAiPathwaysOperatorEnabled: true } });
    renderWithRouter(<DashboardWithContext />);
    expect(screen.queryByText('Pathways')).not.toBeInTheDocument();
    expect(screen.queryByTestId('learner-pathways-alert')).not.toBeInTheDocument();
  });

  it('normalizes a request for the removed ai-pathways tab back to Courses', () => {
    renderWithRouter(<DashboardWithContext />, { route: '/?tab=ai-pathways' });
    expect(screen.getByText('Courses')).toHaveAttribute('aria-selected', 'true');
    expect(screen.queryByText('AI Pathways')).not.toBeInTheDocument();
    expect(sendPageEvent).toHaveBeenCalledWith(
      'enterprise_learner_portal',
      expect.stringContaining('courses_tab'),
      expect.objectContaining({ tab: 'courses' }),
    );
  });

  it('renders programs tab', async () => {
    const user = userEvent.setup();
    useEnterpriseProgramsList.mockReturnValue({ data: [camelCaseObject(dummyProgramData)] });
    renderWithRouter(<DashboardWithContext />);
    await user.click(screen.getByText('Programs'));
    expect(screen.getByTestId('program-listing-page')).toBeInTheDocument();
  });

  it('renders My Career when feature is enabled', () => {
    features.FEATURE_ENABLE_MY_CAREER.mockImplementation(() => true);
    renderWithRouter(<DashboardWithContext />);
    expect(screen.getByText('My Career')).toBeInTheDocument();
  });

  it('renders learner pathways alert scaffold in courses tab when Learner Pathways operator flag is enabled', () => {
    useEnterpriseFeatures.mockReturnValue({ data: { enterpriseAiPathwaysOperatorEnabled: true } });
    renderWithRouter(<DashboardWithContext />);
    expect(screen.getByTestId('learner-pathways-alert')).toBeInTheDocument();
  });

  it('does not render learner pathways alert scaffold when operator flag is disabled', () => {
    useEnterpriseFeatures.mockReturnValue({ data: { enterpriseAiPathwaysOperatorEnabled: false } });
    renderWithRouter(<DashboardWithContext />);
    expect(screen.queryByTestId('learner-pathways-alert')).not.toBeInTheDocument();
  });

  it('renders subsidies summary on a small screen', () => {
    window.matchMedia.setConfig({ ...mockWindowConfig, width: breakpoints.large.minWidth - 1 });
    useSubscriptions.mockReturnValue({
      data: {
        subscriptionLicense: { status: LICENSE_STATUS.ACTIVATED },
        subscriptionPlan: { uuid: 'test-uuid' },
      },
    });
    useHasAvailableSubsidiesOrRequests.mockReturnValue(
      useMockHasAvailableSubsidyOrRequests({ mockHasActivatedCurrentLicenseOrLicenseRequest: true }),
    );
    renderWithRouter(<DashboardWithContext />);
    expect(screen.getByTestId('subsidies-summary')).toBeInTheDocument();
  });

  it('renders "Find a course" when search is enabled for the customer', () => {
    features.FEATURE_ENABLE_TOP_DOWN_ASSIGNMENT.mockImplementation(() => true);
    renderWithRouter(<DashboardWithContext />);
    expect(screen.getByText('Find a course')).toBeInTheDocument();
  });

  it('does not render "Find a course" when search is disabled for the customer', () => {
    const mockEnterpriseCustomerWithoutSearch = enterpriseCustomerFactory({
      disable_search: true,
    });
    useEnterpriseCustomer.mockReturnValue({ data: mockEnterpriseCustomerWithoutSearch });
    renderWithRouter(<DashboardWithContext />);
    expect(screen.queryByText('Find a course')).toBeFalsy();
  });

  it('Renders all tabs for progress in dashboard page', () => {
    const appState = {
      ...defaultAppState,
      enterpriseConfig: {
        name: 'BearsRUs',
        uuid: 'BearsRUs',
        disableSearch: true,
        adminUsers: [{ email: 'admin@foo.com' }],
        enablePathways: true,
        enablePrograms: true,
      },
    };
    renderWithRouter(<DashboardWithContext initialAppState={appState} />);
    expect(screen.getByText('Courses')).toBeInTheDocument();
    expect(screen.getByText('Programs')).toBeInTheDocument();
  });

  it('Selects courses tab from progress tabs by default', () => {
    const appState = {
      ...defaultAppState,
      enterpriseConfig: {
        name: 'BearsRUs',
        uuid: 'BearsRUs',
        disableSearch: true,
        adminUsers: [{ email: 'admin@foo.com' }],
        enablePathways: true,
        enablePrograms: true,
      },
    };
    renderWithRouter(<DashboardWithContext initialAppState={appState} />);
    const coursesTab = screen.getByText('Courses');
    const programsTab = screen.getByText('Programs');
    expect(coursesTab).toHaveAttribute('aria-selected', 'true');
    expect(programsTab).toHaveAttribute('aria-selected', 'false');
  });

  it('should not send duplicate page event when the courses tab selected', async () => {
    const user = userEvent.setup();
    renderWithRouter(<DashboardWithContext />);
    expect(sendPageEvent).toHaveBeenCalledTimes(1);
    await user.click(screen.getByText('Courses'));
    expect(sendPageEvent).toHaveBeenCalledTimes(1);
  });

  it('should send page event when "my-career" tab selected', async () => {
    const user = userEvent.setup(); renderWithRouter(<DashboardWithContext />);
    expect(sendPageEvent).toHaveBeenCalledTimes(1);
    const myCareerTab = screen.getByText('My Career');
    await user.click(myCareerTab);
    expect(sendPageEvent).toHaveBeenCalledTimes(2);
  });

  describe('SubscriptionExpirationModal', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      localStorage.clear();
    });
    it('should not render when > 60 days of access remain', () => {
      renderWithRouter(
        <DashboardWithContext />,
      );
      expect(screen.queryByText(SUBSCRIPTION_EXPIRING_MODAL_TITLE)).toBeFalsy();
      expect(screen.queryByText(SUBSCRIPTION_EXPIRED_MODAL_TITLE)).toBeFalsy();
    });

    it.each([
      {
        daysUntilExpirationIncludingRenewals: 60,
        expirationDate: dayjs().add(60, 'days').toISOString(),
        expectedText: 'days.',
        expectedTimeDiff: (dayjs().add(60, 'days')).diff(dayjs(), 'day'),
      },
      {
        daysUntilExpirationIncludingRenewals: 1,
        expirationDate: dayjs().add(36, 'hours').toISOString(),
        expectedText: 'day.',
        expectedTimeDiff: (dayjs().add(36, 'hours')).diff(dayjs(), 'day'),
      },
      {
        daysUntilExpirationIncludingRenewals: 0,
        expirationDate: dayjs().add(150, 'minutes').toISOString(),
        expectedText: 'hours.',
        expectedTimeDiff: (dayjs().add(150, 'minutes')).diff(dayjs(), 'hour'),
      },
      {
        daysUntilExpirationIncludingRenewals: 0,
        expirationDate: dayjs().add(90, 'minutes').toISOString(),
        expectedText: 'hour.',
        expectedTimeDiff: (dayjs().add(90, 'minutes')).diff(dayjs(), 'hour'),
      },
      {
        daysUntilExpirationIncludingRenewals: 0,
        expirationDate: dayjs().add(150, 'seconds').toISOString(),
        expectedText: 'minutes.',
        expectedTimeDiff: (dayjs().add(150, 'seconds')).diff(dayjs(), 'minute'),
      },
      {
        daysUntilExpirationIncludingRenewals: 0,
        expirationDate: dayjs().add(90, 'seconds').toISOString(),
        expectedText: 'minute.',
        expectedTimeDiff: (dayjs().add(90, 'seconds')).diff(dayjs(), 'minute'),
      },
    ])('should render expiration modal with (%s)', async ({
      expirationDate,
      daysUntilExpirationIncludingRenewals,
      expectedText,
      expectedTimeDiff,
    }) => {
      useSubscriptions.mockReturnValue({
        data: {
          showExpirationNotifications: true,
          subscriptionLicense: {
            uuid: 'test-uuid',
          },
          subscriptionPlan: {
            daysUntilExpirationIncludingRenewals,
            expirationDate,
            isCurrent: true,
          },
        },
      });
      renderWithRouter(
        <DashboardWithContext />,
      );
      expect(screen.queryByText(SUBSCRIPTION_EXPIRING_MODAL_TITLE)).toBeTruthy();
      expect(screen.queryByText(SUBSCRIPTION_EXPIRED_MODAL_TITLE)).toBeFalsy();
      await waitFor(() => {
        expect(screen.getByText(expectedTimeDiff)).toBeTruthy();
        expect(screen.getByText(expectedText)).toBeTruthy();
      });
    });

    it('should render the expired version of the modal when 0 >= daysUntilExpirationIncludingRenewals', async () => {
      const user = userEvent.setup();
      const subscriptionLicense = {
        uuid: uuidv4(),
      };
      useSubscriptions.mockReturnValue({
        data: {
          showExpirationNotifications: true,
          subscriptionLicense,
          subscriptionPlan: {
            daysUntilExpirationIncludingRenewals: 5,
          },
        },
      });
      renderWithRouter(<DashboardWithContext />);
      expect(screen.queryByText(SUBSCRIPTION_EXPIRING_MODAL_TITLE)).toBeFalsy();
      expect(screen.queryByText(SUBSCRIPTION_EXPIRED_MODAL_TITLE)).toBeTruthy();
      await user.click(screen.getByTestId('subscription-expiration-button'));
      await waitFor(() => expect(screen.queryByText(SUBSCRIPTION_EXPIRED_MODAL_TITLE)).toBeFalsy());
      const expiredModalLocalStorageKey = !!global.localStorage.getItem(
        EXPIRED_SUBSCRIPTION_MODAL_LOCALSTORAGE_KEY(subscriptionLicense),
      );
      expect(expiredModalLocalStorageKey).toBe(true);
    });

    it('should not render when 0 >= daysUntilExpirationIncludingRenewals and expiration messages are disabled ', () => {
      useSubscriptions.mockReturnValue({
        data: {
          showExpirationNotifications: false,
          subscriptionPlan: {
            daysUntilExpirationIncludingRenewals: 0,
            isCurrent: false,
          },
        },
      });
      renderWithRouter(<DashboardWithContext />);
      expect(screen.queryByText(SUBSCRIPTION_EXPIRING_MODAL_TITLE)).toBeFalsy();
      expect(screen.queryByText(SUBSCRIPTION_EXPIRED_MODAL_TITLE)).toBeFalsy();
    });

    it('should not render when 60 >= daysUntilExpirationIncludingRenewals > 0 and expiration messages are disabled', () => {
      useSubscriptions.mockReturnValue({
        data: {
          showExpirationNotifications: false,
          subscriptionPlan: {
            daysUntilExpirationIncludingRenewals: 60,
            isCurrent: true,
          },
        },
      });
      renderWithRouter(<DashboardWithContext />);
      expect(screen.queryByText(SUBSCRIPTION_EXPIRING_MODAL_TITLE)).toBeFalsy();
      expect(screen.queryByText(SUBSCRIPTION_EXPIRED_MODAL_TITLE)).toBeFalsy();
    });

    it('should render the expiration warning version of the modal when 60 >= daysUntilExpirationIncludingRenewals > 0', () => {
      useSubscriptions.mockReturnValue({
        data: {
          showExpirationNotifications: true,
          subscriptionLicense: {
            uuid: 'test-uuid',
          },
          subscriptionPlan: {
            daysUntilExpirationIncludingRenewals: 60,
            isCurrent: true,
          },
        },
      });
      renderWithRouter(<DashboardWithContext />);
      expect(screen.queryByText(SUBSCRIPTION_EXPIRING_MODAL_TITLE)).toBeTruthy();
      expect(screen.queryByText(SUBSCRIPTION_EXPIRED_MODAL_TITLE)).toBeFalsy();
    });

    it.each([
      { threshold: 30 },
      { threshold: 60 },
    ])('should set localstorage when closed for the threshold (%s)', async ({ threshold }) => {
      const user = userEvent.setup();
      const subscriptionPlanId = `expiring-plan-${threshold}`;
      useSubscriptions.mockReturnValue({
        data: {
          showExpirationNotifications: true,
          subscriptionLicense: {
            uuid: 'test-uuid',
          },
          subscriptionPlan: {
            uuid: subscriptionPlanId,
            daysUntilExpirationIncludingRenewals: threshold,
            isCurrent: true,
          },
        },
      });
      renderWithRouter(<DashboardWithContext />);
      expect(screen.queryByText(SUBSCRIPTION_EXPIRING_MODAL_TITLE)).toBeTruthy();
      expect(screen.queryByText(SUBSCRIPTION_EXPIRED_MODAL_TITLE)).toBeFalsy();
      await user.click(screen.getByTestId('subscription-expiration-button'));
      const hasExpirationModal = !!global.localStorage.getItem(`${SEEN_SUBSCRIPTION_EXPIRATION_MODAL_COOKIE_PREFIX}${threshold}-${subscriptionPlanId}`);
      expect(hasExpirationModal).toEqual(true);
    });

    it.each([
      { threshold: 30 },
      { threshold: 60 },
    ])('should not show the modal if localstorage has been set (%s)', ({ threshold }) => {
      const subscriptionPlanId = `expiring-plan-${threshold}`;
      useSubscriptions.mockReturnValue({
        data: {
          showExpirationNotifications: true,
          subscriptionLicense: {
            uuid: 'test-uuid',
          },
          subscriptionPlan: {
            uuid: subscriptionPlanId,
            daysUntilExpirationIncludingRenewals: threshold,
            isCurrent: true,
          },
        },
      });
      global.localStorage.setItem(
        EXPIRING_SUBSCRIPTION_MODAL_LOCALSTORAGE_KEY({
          uuid: subscriptionPlanId,
          threshold,
        }),
        'true',
      );
      renderWithRouter(
        <DashboardWithContext />,
      );
      expect(screen.queryByText(SUBSCRIPTION_EXPIRING_MODAL_TITLE)).toBeFalsy();
      expect(screen.queryByText(SUBSCRIPTION_EXPIRED_MODAL_TITLE)).toBeFalsy();
    });
  });
});
