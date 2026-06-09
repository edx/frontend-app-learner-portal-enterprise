import { act, renderHook } from '@testing-library/react';
import { IntlProvider } from '@edx/frontend-platform/i18n';
import { AppContext } from '@edx/frontend-platform/react';
import { QueryClientProvider } from '@tanstack/react-query';

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
  DASHBOARD_AI_PATHWAYS_TAB,
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
    FEATURE_ENABLE_AI_LEARNER_PATHWAYS: false,
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

const wrapper = ({ children }) => (
  <QueryClientProvider client={queryClient()}>
    <IntlProvider locale="en">
      <AppContext.Provider value={{ authenticatedUser: mockAuthenticatedUser }}>
        {children}
      </AppContext.Provider>
    </IntlProvider>
  </QueryClientProvider>
);

describe('useDashboardTabs', () => {
  const getCoursesTabChildProps = (tabs) => {
    const coursesTab = tabs.find(tab => tab.props.eventKey === DASHBOARD_COURSES_TAB);
    return coursesTab?.props?.children?.props;
  };
  const getPathwaysTabChild = (tabs) => {
    const pathwaysTab = tabs.find(tab => tab.props.eventKey === DASHBOARD_PATHWAYS_TAB);
    return pathwaysTab?.props?.children;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    useEnterpriseCustomer.mockReturnValue({ data: mockEnterpriseCustomer });
    useEnterpriseFeatures.mockReturnValue({ data: {} });
    useEnterpriseProgramsList.mockReturnValue({ data: [] });
    useEnterprisePathwaysList.mockReturnValue({ data: [] });
    features.FEATURE_ENABLE_AI_LEARNER_PATHWAYS = false;
    features.FEATURE_ENABLE_MY_CAREER = false;
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

    it('renders learner pathways scaffold in pathways tab when dual AI pathways flags are enabled', () => {
      useEnterpriseCustomer.mockReturnValue({ data: enterpriseCustomerFactory({ enable_pathways: true }) });
      features.FEATURE_ENABLE_AI_LEARNER_PATHWAYS = true;
      useEnterpriseFeatures.mockReturnValue({ data: { enterpriseAiPathwaysOperatorEnabled: true } });
      useEnterprisePathwaysList.mockReturnValue({ data: [{ uuid: 'test-pathway' }] });

      const { result } = renderHook(() => useDashboardTabs(), { wrapper });

      act(() => {
        result.current.onSelectHandler(DASHBOARD_PATHWAYS_TAB);
      });

      const pathwaysTabChild = getPathwaysTabChild(result.current.tabs);
      expect(pathwaysTabChild.type).toBe(LearnerPathwaysTab);
    });

    it('preserves legacy pathways listing in pathways tab when dual AI pathways flags are not enabled', () => {
      useEnterpriseCustomer.mockReturnValue({ data: enterpriseCustomerFactory({ enable_pathways: true }) });
      features.FEATURE_ENABLE_AI_LEARNER_PATHWAYS = false;
      useEnterpriseFeatures.mockReturnValue({ data: { enterpriseAiPathwaysOperatorEnabled: true } });
      useEnterprisePathwaysList.mockReturnValue({ data: [{ uuid: 'test-pathway' }] });

      const { result } = renderHook(() => useDashboardTabs(), { wrapper });

      act(() => {
        result.current.onSelectHandler(DASHBOARD_PATHWAYS_TAB);
      });

      const pathwaysTabChild = getPathwaysTabChild(result.current.tabs);
      expect(pathwaysTabChild.type).toBe(PathwayProgressListingPage);
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

  describe('AI Pathways tab (enterpriseAiPathwaysOperatorEnabled)', () => {
    it('is shown when both FEATURE_ENABLE_AI_LEARNER_PATHWAYS and enterpriseAiPathwaysOperatorEnabled are enabled', () => {
      features.FEATURE_ENABLE_AI_LEARNER_PATHWAYS = true;
      useEnterpriseFeatures.mockReturnValue({ data: { enterpriseAiPathwaysOperatorEnabled: true } });
      const { result } = renderHook(() => useDashboardTabs(), { wrapper });
      const tabKeys = result.current.tabs.map(tab => tab.props.eventKey);
      expect(tabKeys).toContain(DASHBOARD_AI_PATHWAYS_TAB);
    });

    it('is not shown when FEATURE_ENABLE_AI_LEARNER_PATHWAYS is disabled and enterpriseAiPathwaysOperatorEnabled is enabled', () => {
      features.FEATURE_ENABLE_AI_LEARNER_PATHWAYS = false;
      useEnterpriseFeatures.mockReturnValue({ data: { enterpriseAiPathwaysOperatorEnabled: true } });
      const { result } = renderHook(() => useDashboardTabs(), { wrapper });
      const tabKeys = result.current.tabs.map(tab => tab.props.eventKey);
      expect(tabKeys).not.toContain(DASHBOARD_AI_PATHWAYS_TAB);
    });

    it('is not shown when FEATURE_ENABLE_AI_LEARNER_PATHWAYS is enabled and enterpriseAiPathwaysOperatorEnabled is disabled', () => {
      features.FEATURE_ENABLE_AI_LEARNER_PATHWAYS = true;
      useEnterpriseFeatures.mockReturnValue({ data: { enterpriseAiPathwaysOperatorEnabled: false } });
      const { result } = renderHook(() => useDashboardTabs(), { wrapper });
      const tabKeys = result.current.tabs.map(tab => tab.props.eventKey);
      expect(tabKeys).not.toContain(DASHBOARD_AI_PATHWAYS_TAB);
    });

    it('is not shown when both FEATURE_ENABLE_AI_LEARNER_PATHWAYS and enterpriseAiPathwaysOperatorEnabled are disabled', () => {
      features.FEATURE_ENABLE_AI_LEARNER_PATHWAYS = false;
      useEnterpriseFeatures.mockReturnValue({ data: { enterpriseAiPathwaysOperatorEnabled: false } });
      const { result } = renderHook(() => useDashboardTabs(), { wrapper });
      const tabKeys = result.current.tabs.map(tab => tab.props.eventKey);
      expect(tabKeys).not.toContain(DASHBOARD_AI_PATHWAYS_TAB);
    });

    it('is not shown when enterpriseAiPathwaysOperatorEnabled is absent from enterprise features', () => {
      features.FEATURE_ENABLE_AI_LEARNER_PATHWAYS = true;
      useEnterpriseFeatures.mockReturnValue({ data: {} });
      const { result } = renderHook(() => useDashboardTabs(), { wrapper });
      const tabKeys = result.current.tabs.map(tab => tab.props.eventKey);
      expect(tabKeys).not.toContain(DASHBOARD_AI_PATHWAYS_TAB);
    });
  });

  describe('Learner pathways alert feature-flag wiring on courses tab', () => {
    it('enables learner pathways alert when both AI feature flag and operator flag are true', () => {
      features.FEATURE_ENABLE_AI_LEARNER_PATHWAYS = true;
      useEnterpriseFeatures.mockReturnValue({ data: { enterpriseAiPathwaysOperatorEnabled: true } });
      const { result } = renderHook(() => useDashboardTabs(), { wrapper });
      const coursesProps = getCoursesTabChildProps(result.current.tabs);
      expect(coursesProps.showLearnerPathwaysAlert).toBe(true);
    });

    it('disables learner pathways alert when AI feature flag is false', () => {
      features.FEATURE_ENABLE_AI_LEARNER_PATHWAYS = false;
      useEnterpriseFeatures.mockReturnValue({ data: { enterpriseAiPathwaysOperatorEnabled: true } });
      const { result } = renderHook(() => useDashboardTabs(), { wrapper });
      const coursesProps = getCoursesTabChildProps(result.current.tabs);
      expect(coursesProps.showLearnerPathwaysAlert).toBe(false);
    });

    it('disables learner pathways alert when operator flag is false', () => {
      features.FEATURE_ENABLE_AI_LEARNER_PATHWAYS = true;
      useEnterpriseFeatures.mockReturnValue({ data: { enterpriseAiPathwaysOperatorEnabled: false } });
      const { result } = renderHook(() => useDashboardTabs(), { wrapper });
      const coursesProps = getCoursesTabChildProps(result.current.tabs);
      expect(coursesProps.showLearnerPathwaysAlert).toBe(false);
    });
  });
});
