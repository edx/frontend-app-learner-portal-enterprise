import { act, renderHook } from '@testing-library/react';
import { IntlProvider } from '@edx/frontend-platform/i18n';
import { AppContext } from '@edx/frontend-platform/react';
import { mergeConfig } from '@edx/frontend-platform';
import { QueryClientProvider } from '@tanstack/react-query';
import { NIL as NIL_UUID } from 'uuid';

import { MemoryRouter } from 'react-router-dom';
import useDashboardTabs from './useDashboardTabs';
import { features } from '../../../config';
import PathwayProgressListingPage from '../../pathway-progress/PathwayProgressListingPage';
import {
  useEnterpriseCustomer,
  useEnterpriseFeatures,
  useEnterprisePathwaysList,
  useEnterpriseProgramsList,
} from '../../app/data';
import { queryClient } from '../../../utils/tests';
import {
  authenticatedUserFactory,
  enterpriseCustomerFactory,
} from '../../app/data/services/data/__factories__';
import {
  DASHBOARD_COURSES_TAB,
  DASHBOARD_MY_CAREER_TAB,
  DASHBOARD_PATHWAYS_TAB,
  DASHBOARD_PROGRAMS_TAB,
} from './constants';
import { LearnerPathwaysTab } from '../main-content/learner-pathways';

jest.mock('../../app/data', () => ({
  ...jest.requireActual('../../app/data'),
  useEnterpriseCustomer: jest.fn(),
  useEnterpriseFeatures: jest.fn(),
  useEnterprisePathwaysList: jest.fn(),
  useEnterpriseProgramsList: jest.fn(),
}));

jest.mock('../../../config', () => ({
  features: {
    FEATURE_ENABLE_MY_CAREER: false,
  },
}));

jest.mock('@2uinc/frontend-enterprise-utils', () => ({
  ...jest.requireActual('@2uinc/frontend-enterprise-utils'),
  sendEnterpriseTrackEvent: jest.fn(),
}));

jest.mock('../../my-career/data/utils', () => ({
  extractCurrentJobID: jest.fn().mockReturnValue(null),
}));

jest.mock('@loadable/component', () => jest.fn(() => ({ preload: jest.fn() })));

const mockEnterpriseCustomer = enterpriseCustomerFactory();
const mockAuthenticatedUser = authenticatedUserFactory();

const createWrapper = (initialEntries = ['/']) => function Wrapper({ children }) {
  return (
    <QueryClientProvider client={queryClient()}>
      <IntlProvider locale="en">
        <MemoryRouter initialEntries={initialEntries}>
          <AppContext.Provider value={{ authenticatedUser: mockAuthenticatedUser }}>
            {children}
          </AppContext.Provider>
        </MemoryRouter>
      </IntlProvider>
    </QueryClientProvider>
  );
};

const wrapper = createWrapper();

describe('useDashboardTabs', () => {
  const getCoursesTabChildProps = (tabs) => {
    const coursesTab = tabs.find(tab => tab.props.eventKey === DASHBOARD_COURSES_TAB);
    return coursesTab?.props?.children?.props;
  };
  const getPathwaysTab = (tabs) => tabs.find(tab => tab.props.eventKey === DASHBOARD_PATHWAYS_TAB);
  const getPathwaysTabChild = (tabs) => getPathwaysTab(tabs)?.props?.children;
  const getPathwaysTabBetaBadge = (tabs) => getPathwaysTab(tabs)?.props?.title?.props?.children?.[1];

  beforeEach(() => {
    jest.clearAllMocks();
    useEnterpriseCustomer.mockReturnValue({ data: mockEnterpriseCustomer });
    useEnterpriseFeatures.mockReturnValue({ data: {} });
    useEnterpriseProgramsList.mockReturnValue({ data: [] });
    useEnterprisePathwaysList.mockReturnValue({ data: [] });
    features.FEATURE_ENABLE_MY_CAREER = false;
    // Nil-uuid wildcard by default so every existing test below (which never touches this
    // allowlist itself) keeps its current "enabled for all" expectations.
    mergeConfig({ FEATURE_ENABLE_LEARNER_PATHWAYS_FOR_ENTERPRISE_CUSTOMERS: NIL_UUID });
  });

  it('always returns courses tab', () => {
    const { result } = renderHook(() => useDashboardTabs(), { wrapper });
    const tabKeys = result.current.tabs.map(tab => tab.props.eventKey);
    expect(tabKeys).toContain(DASHBOARD_COURSES_TAB);
  });

  it('returns expected hook shape', () => {
    const { result } = renderHook(() => useDashboardTabs(), { wrapper });
    expect(result.current).toMatchObject({
      tabs: expect.any(Array),
      onSelectHandler: expect.any(Function),
      activeTab: DASHBOARD_COURSES_TAB,
      prefetchTabs: expect.any(Function),
    });
  });

  describe('programs tab', () => {
    it('is shown when enterprise customer has programs enabled', () => {
      const enterpriseCustomerWithPrograms = enterpriseCustomerFactory({ enable_programs: true });
      useEnterpriseCustomer.mockReturnValue({ data: enterpriseCustomerWithPrograms });
      const { result } = renderHook(() => useDashboardTabs(), { wrapper });
      const tabKeys = result.current.tabs.map(tab => tab.props.eventKey);
      expect(tabKeys).toContain(DASHBOARD_PROGRAMS_TAB);
    });

    it('is not shown when enterprise customer has programs disabled', () => {
      const enterpriseCustomerWithoutPrograms = enterpriseCustomerFactory({ enable_programs: false });
      useEnterpriseCustomer.mockReturnValue({ data: enterpriseCustomerWithoutPrograms });
      const { result } = renderHook(() => useDashboardTabs(), { wrapper });
      const tabKeys = result.current.tabs.map(tab => tab.props.eventKey);
      expect(tabKeys).not.toContain(DASHBOARD_PROGRAMS_TAB);
    });
  });

  describe('pathways tab', () => {
    it('is shown when enterprise customer has pathways enabled', () => {
      const enterpriseCustomerWithPathways = enterpriseCustomerFactory({ enable_pathways: true });
      useEnterpriseCustomer.mockReturnValue({ data: enterpriseCustomerWithPathways });
      const { result } = renderHook(() => useDashboardTabs(), { wrapper });
      const tabKeys = result.current.tabs.map(tab => tab.props.eventKey);
      expect(tabKeys).toContain(DASHBOARD_PATHWAYS_TAB);
    });

    it('is not shown when enterprise customer has pathways disabled', () => {
      const enterpriseCustomerWithoutPathways = enterpriseCustomerFactory({ enable_pathways: false });
      useEnterpriseCustomer.mockReturnValue({ data: enterpriseCustomerWithoutPathways });
      const { result } = renderHook(() => useDashboardTabs(), { wrapper });
      const tabKeys = result.current.tabs.map(tab => tab.props.eventKey);
      expect(tabKeys).not.toContain(DASHBOARD_PATHWAYS_TAB);
    });

    it('is not shown when enterprise customer has pathways disabled even if Learner Pathways is enabled', () => {
      useEnterpriseCustomer.mockReturnValue({ data: enterpriseCustomerFactory({ enable_pathways: false }) });
      useEnterpriseFeatures.mockReturnValue({ data: { enterpriseAiPathwaysOperatorEnabled: true } });
      const { result } = renderHook(() => useDashboardTabs(), { wrapper });
      const tabKeys = result.current.tabs.map(tab => tab.props.eventKey);
      expect(tabKeys).not.toContain(DASHBOARD_PATHWAYS_TAB);
    });

    it('is available and renders LearnerPathwaysTab when Learner Pathways is enabled, even with zero existing pathways', () => {
      useEnterpriseCustomer.mockReturnValue({ data: enterpriseCustomerFactory({ enable_pathways: true }) });
      useEnterpriseFeatures.mockReturnValue({ data: { enterpriseAiPathwaysOperatorEnabled: true } });
      useEnterprisePathwaysList.mockReturnValue({ data: [] });

      const { result } = renderHook(() => useDashboardTabs(), { wrapper });

      expect(getPathwaysTab(result.current.tabs).props.disabled).toBe(false);

      act(() => {
        result.current.onSelectHandler(DASHBOARD_PATHWAYS_TAB);
      });

      expect(result.current.activeTab).toBe(DASHBOARD_PATHWAYS_TAB);
      const pathwaysTabChild = getPathwaysTabChild(result.current.tabs);
      expect(pathwaysTabChild.type).toBe(LearnerPathwaysTab);
    });

    it('is available and renders PathwayProgressListingPage when Learner Pathways is disabled and existing pathways are present', () => {
      useEnterpriseCustomer.mockReturnValue({ data: enterpriseCustomerFactory({ enable_pathways: true }) });
      useEnterpriseFeatures.mockReturnValue({ data: { enterpriseAiPathwaysOperatorEnabled: false } });
      useEnterprisePathwaysList.mockReturnValue({ data: [{ uuid: 'test-pathway' }] });

      const { result } = renderHook(() => useDashboardTabs(), { wrapper });

      expect(getPathwaysTab(result.current.tabs).props.disabled).toBe(false);

      act(() => {
        result.current.onSelectHandler(DASHBOARD_PATHWAYS_TAB);
      });

      const pathwaysTabChild = getPathwaysTabChild(result.current.tabs);
      expect(pathwaysTabChild.type).toBe(PathwayProgressListingPage);
    });

    it('is visible but unavailable when Learner Pathways is disabled and there are no existing pathways', () => {
      useEnterpriseCustomer.mockReturnValue({ data: enterpriseCustomerFactory({ enable_pathways: true }) });
      useEnterpriseFeatures.mockReturnValue({ data: { enterpriseAiPathwaysOperatorEnabled: false } });
      useEnterprisePathwaysList.mockReturnValue({ data: [] });

      const { result } = renderHook(() => useDashboardTabs(), { wrapper });
      const tabKeys = result.current.tabs.map(tab => tab.props.eventKey);
      expect(tabKeys).toContain(DASHBOARD_PATHWAYS_TAB);
      expect(getPathwaysTab(result.current.tabs).props.disabled).toBe(true);

      act(() => {
        result.current.onSelectHandler(DASHBOARD_PATHWAYS_TAB);
      });

      expect(result.current.activeTab).toBe(DASHBOARD_COURSES_TAB);
    });

    it('includes the Beta badge in the tab title when the tab is available', () => {
      useEnterpriseCustomer.mockReturnValue({ data: enterpriseCustomerFactory({ enable_pathways: true }) });
      useEnterpriseFeatures.mockReturnValue({ data: { enterpriseAiPathwaysOperatorEnabled: true } });
      useEnterprisePathwaysList.mockReturnValue({ data: [] });

      const { result } = renderHook(() => useDashboardTabs(), { wrapper });
      expect(getPathwaysTabBetaBadge(result.current.tabs)).toBeTruthy();
    });

    it('omits the Beta badge when the tab is visible but unavailable', () => {
      useEnterpriseCustomer.mockReturnValue({ data: enterpriseCustomerFactory({ enable_pathways: true }) });
      useEnterpriseFeatures.mockReturnValue({ data: { enterpriseAiPathwaysOperatorEnabled: false } });
      useEnterprisePathwaysList.mockReturnValue({ data: [] });

      const { result } = renderHook(() => useDashboardTabs(), { wrapper });
      expect(getPathwaysTabBetaBadge(result.current.tabs)).toBeFalsy();
    });
  });

  describe('My Career tab', () => {
    it('is shown when FEATURE_ENABLE_MY_CAREER is enabled', () => {
      features.FEATURE_ENABLE_MY_CAREER = true;
      const { result } = renderHook(() => useDashboardTabs(), { wrapper });
      const tabKeys = result.current.tabs.map(tab => tab.props.eventKey);
      expect(tabKeys).toContain(DASHBOARD_MY_CAREER_TAB);
    });

    it('is not shown when FEATURE_ENABLE_MY_CAREER is disabled', () => {
      features.FEATURE_ENABLE_MY_CAREER = false;
      const { result } = renderHook(() => useDashboardTabs(), { wrapper });
      const tabKeys = result.current.tabs.map(tab => tab.props.eventKey);
      expect(tabKeys).not.toContain(DASHBOARD_MY_CAREER_TAB);
    });
  });

  describe('Learner pathways alert feature-flag wiring on courses tab', () => {
    it('enables learner pathways alert when pathways enabled and Learner Pathways operator flag is true', () => {
      useEnterpriseCustomer.mockReturnValue({ data: enterpriseCustomerFactory({ enable_pathways: true }) });
      useEnterpriseFeatures.mockReturnValue({ data: { enterpriseAiPathwaysOperatorEnabled: true } });
      const { result } = renderHook(() => useDashboardTabs(), { wrapper });
      const coursesProps = getCoursesTabChildProps(result.current.tabs);
      expect(coursesProps.showLearnerPathwaysAlert).toBe(true);
      expect(coursesProps.hasPathwaysTab).toBe(true);
    });

    it('disables learner pathways alert when customer pathways is disabled, even if operator flag is true', () => {
      useEnterpriseCustomer.mockReturnValue({ data: enterpriseCustomerFactory({ enable_pathways: false }) });
      useEnterpriseFeatures.mockReturnValue({ data: { enterpriseAiPathwaysOperatorEnabled: true } });
      const { result } = renderHook(() => useDashboardTabs(), { wrapper });
      const coursesProps = getCoursesTabChildProps(result.current.tabs);
      expect(coursesProps.showLearnerPathwaysAlert).toBe(false);
    });

    it('disables learner pathways alert when operator flag is false', () => {
      useEnterpriseCustomer.mockReturnValue({ data: enterpriseCustomerFactory({ enable_pathways: true }) });
      useEnterpriseFeatures.mockReturnValue({ data: { enterpriseAiPathwaysOperatorEnabled: false } });
      const { result } = renderHook(() => useDashboardTabs(), { wrapper });
      const coursesProps = getCoursesTabChildProps(result.current.tabs);
      expect(coursesProps.showLearnerPathwaysAlert).toBe(false);
    });

    it('disables learner pathways alert when operator flag is absent from enterprise features', () => {
      useEnterpriseCustomer.mockReturnValue({ data: enterpriseCustomerFactory({ enable_pathways: true }) });
      useEnterpriseFeatures.mockReturnValue({ data: {} });
      const { result } = renderHook(() => useDashboardTabs(), { wrapper });
      const coursesProps = getCoursesTabChildProps(result.current.tabs);
      expect(coursesProps.showLearnerPathwaysAlert).toBe(false);
    });
  });

  describe('Learner pathways enterprise-customer allowlist gating', () => {
    const ALLOWLISTED_UUID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    const OTHER_UUID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

    it('behaves identically to the nil-uuid wildcard default when the customer uuid is explicitly allowlisted', () => {
      mergeConfig({ FEATURE_ENABLE_LEARNER_PATHWAYS_FOR_ENTERPRISE_CUSTOMERS: ALLOWLISTED_UUID });
      useEnterpriseCustomer.mockReturnValue({
        data: enterpriseCustomerFactory({ enable_pathways: true, uuid: ALLOWLISTED_UUID }),
      });
      useEnterpriseFeatures.mockReturnValue({ data: { enterpriseAiPathwaysOperatorEnabled: true } });

      const { result } = renderHook(() => useDashboardTabs(), { wrapper });
      const coursesProps = getCoursesTabChildProps(result.current.tabs);
      expect(coursesProps.showLearnerPathwaysAlert).toBe(true);
      expect(coursesProps.hasPathwaysTab).toBe(true);
    });

    it('disables the banner and makes the tab unavailable when the customer uuid is excluded from the allowlist and there are no existing pathways, even with the operator flag enabled', () => {
      // Mirrors the existing "operator flag is false, no existing pathways" behavior:
      // excluding the customer from the allowlist suppresses isLearnerPathwaysEnabled the
      // same way a disabled operator flag would, so with no legacy pathways to fall back
      // on, hasPathwaysTab correctly becomes false rather than showing a legacy page.
      mergeConfig({ FEATURE_ENABLE_LEARNER_PATHWAYS_FOR_ENTERPRISE_CUSTOMERS: ALLOWLISTED_UUID });
      useEnterpriseCustomer.mockReturnValue({
        data: enterpriseCustomerFactory({ enable_pathways: true, uuid: OTHER_UUID }),
      });
      useEnterpriseFeatures.mockReturnValue({ data: { enterpriseAiPathwaysOperatorEnabled: true } });
      useEnterprisePathwaysList.mockReturnValue({ data: [] });

      const { result } = renderHook(() => useDashboardTabs(), { wrapper });
      const coursesProps = getCoursesTabChildProps(result.current.tabs);
      expect(coursesProps.showLearnerPathwaysAlert).toBe(false);
      expect(coursesProps.hasPathwaysTab).toBe(false);
      expect(getPathwaysTab(result.current.tabs).props.disabled).toBe(true);
    });

    it('still shows an available Pathways tab (legacy PathwayProgressListingPage) for a customer excluded from the allowlist who already has existing pathways', () => {
      mergeConfig({ FEATURE_ENABLE_LEARNER_PATHWAYS_FOR_ENTERPRISE_CUSTOMERS: ALLOWLISTED_UUID });
      useEnterpriseCustomer.mockReturnValue({
        data: enterpriseCustomerFactory({ enable_pathways: true, uuid: OTHER_UUID }),
      });
      useEnterpriseFeatures.mockReturnValue({ data: { enterpriseAiPathwaysOperatorEnabled: true } });
      useEnterprisePathwaysList.mockReturnValue({ data: [{ uuid: 'test-pathway' }] });

      const { result } = renderHook(() => useDashboardTabs(), { wrapper });
      expect(getPathwaysTab(result.current.tabs).props.disabled).toBe(false);

      const coursesProps = getCoursesTabChildProps(result.current.tabs);
      expect(coursesProps.showLearnerPathwaysAlert).toBe(false);

      act(() => {
        result.current.onSelectHandler(DASHBOARD_PATHWAYS_TAB);
      });
      const pathwaysTabChild = getPathwaysTabChild(result.current.tabs);
      expect(pathwaysTabChild.type).toBe(PathwayProgressListingPage);
    });
  });

  describe('removed AI Pathways query value normalization', () => {
    it('normalizes a request for the removed ai-pathways tab back to courses', () => {
      const { result } = renderHook(() => useDashboardTabs(), {
        wrapper: createWrapper(['/?tab=ai-pathways']),
      });
      expect(result.current.activeTab).toBe(DASHBOARD_COURSES_TAB);
      const tabKeys = result.current.tabs.map(tab => tab.props.eventKey);
      expect(tabKeys).not.toContain('ai-pathways');
    });
  });
});
