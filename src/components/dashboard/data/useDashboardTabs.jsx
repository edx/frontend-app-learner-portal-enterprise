import {
  useCallback, useContext, useEffect, useMemo, useRef,
} from 'react';
import loadable from '@loadable/component';
import { useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Badge, Tab } from '@openedx/paragon';
import { useIntl } from '@edx/frontend-platform/i18n';
import { AppContext } from '@edx/frontend-platform/react';

import { sendPageEvent } from '@edx/frontend-platform/analytics';
import CoursesTabComponent from '../main-content/CoursesTabComponent';
import { LearnerPathwaysTab } from '../main-content/learner-pathways';
import { ProgramListingPage } from '../../program-progress';
import PathwayProgressListingPage from '../../pathway-progress/PathwayProgressListingPage';
import { features } from '../../../config';
import {
  DASHBOARD_COURSES_TAB,
  DASHBOARD_MY_CAREER_TAB,
  DASHBOARD_PATHWAYS_TAB,
  DASHBOARD_PROGRAMS_TAB,
  DASHBOARD_TABS_SEGMENT_KEY,
} from './constants';
import MyCareerTabSkeleton from '../../my-career/MyCareerTabSkeleton';
import {
  queryLearnerSkillLevels,
  useEnterpriseCustomer,
  useEnterpriseFeatures,
  useEnterprisePathwaysList,
  useEnterpriseProgramsList,
} from '../../app/data';
import { extractCurrentJobID } from '../../my-career/data/utils';

const MyCareerTab = loadable(() => import(
  '../../my-career/MyCareerTab'
), {
  fallback: <MyCareerTabSkeleton />,
});

const getDashboardPageVisitEvent = tabName => (
  `edx.ui.enterprise.learner_portal.${DASHBOARD_TABS_SEGMENT_KEY[tabName]}.page_visit`
);

const useDashboardTabs = () => {
  const intl = useIntl();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const { authenticatedUser } = useContext(AppContext);
  const { data: enterpriseCustomer } = useEnterpriseCustomer();
  const { data: enterprisePrograms = [] } = useEnterpriseProgramsList();
  const { data: enterprisePathways = [] } = useEnterprisePathwaysList();
  const { data: enterpriseFeatures } = useEnterpriseFeatures();

  const lastTrackedPageVisitRef = useRef(null);

  const enterpriseCustomerUuid = enterpriseCustomer?.uuid;
  const enablePrograms = !!enterpriseCustomer?.enablePrograms;
  const enablePathways = !!enterpriseCustomer?.enablePathways;
  const enableMyCareer = features.FEATURE_ENABLE_MY_CAREER;

  const isLearnerPathwaysEnabled = !!enterpriseFeatures?.enterpriseAiPathwaysOperatorEnabled;
  const hasExistingPathways = enterprisePathways.length > 0;
  const hasPathwaysTab = enablePathways && (isLearnerPathwaysEnabled || hasExistingPathways);
  const showLearnerPathwaysAlert = enablePathways && isLearnerPathwaysEnabled;

  const learnerCurrentJobID = extractCurrentJobID(authenticatedUser);

  const requestedTab = searchParams.get('tab');

  const tabState = useMemo(() => ({
    [DASHBOARD_COURSES_TAB]: {
      isVisible: true,
      isAvailable: true,
    },
    [DASHBOARD_PROGRAMS_TAB]: {
      isVisible: enablePrograms,
      isAvailable: enablePrograms && enterprisePrograms.length > 0,
    },
    [DASHBOARD_PATHWAYS_TAB]: {
      isVisible: enablePathways,
      isAvailable: hasPathwaysTab,
    },
    [DASHBOARD_MY_CAREER_TAB]: {
      isVisible: enableMyCareer,
      isAvailable: enableMyCareer,
    },
  }), [
    enableMyCareer,
    enablePathways,
    enablePrograms,
    enterprisePrograms.length,
    hasPathwaysTab,
  ]);

  const activeTab = tabState[requestedTab]?.isAvailable
    ? requestedTab
    : DASHBOARD_COURSES_TAB;

  const prefetchTabs = useCallback(() => {
    if (!enableMyCareer) {
      return;
    }

    MyCareerTab.preload();

    if (learnerCurrentJobID) {
      queryClient.prefetchQuery(queryLearnerSkillLevels(learnerCurrentJobID));
    }
  }, [enableMyCareer, learnerCurrentJobID, queryClient]);

  useEffect(() => {
    prefetchTabs();
  }, [prefetchTabs]);

  // Normalize /:enterpriseSlug to /:enterpriseSlug?tab=courses.
  // Also normalizes invalid or unavailable tabs back to the resolved active tab.
  useEffect(() => {
    if (requestedTab === activeTab) {
      return;
    }

    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('tab', activeTab);
      return next;
    }, { replace: true });
  }, [activeTab, requestedTab, setSearchParams]);

  const onSelectHandler = useCallback((tabName) => {
    if (tabName === activeTab || !tabState[tabName]?.isAvailable) {
      return;
    }

    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('tab', tabName);
      return next;
    });
  }, [activeTab, setSearchParams, tabState]);

  useEffect(() => {
    if (!enterpriseCustomerUuid) {
      return;
    }

    const eventName = getDashboardPageVisitEvent(activeTab);
    const eventKey = `${enterpriseCustomerUuid}:${eventName}`;

    if (lastTrackedPageVisitRef.current === eventKey) {
      return;
    }

    lastTrackedPageVisitRef.current = eventKey;

    sendPageEvent(
      'enterprise_learner_portal',
      getDashboardPageVisitEvent(activeTab),
      {
        tab: activeTab,
        enterpriseCustomerUuid,
      },
    );
  }, [activeTab, enterpriseCustomerUuid]);

  const allTabs = useMemo(() => ([
    <Tab
      key={DASHBOARD_COURSES_TAB}
      eventKey={DASHBOARD_COURSES_TAB}
      title={intl.formatMessage({
        id: 'enterprise.dashboard.tab.courses',
        defaultMessage: 'Courses',
        description: 'Title for courses tab on enterprise dashboard.',
      })}
    >
      {activeTab === DASHBOARD_COURSES_TAB && (
        <CoursesTabComponent
          onSelectTab={onSelectHandler}
          hasPathwaysTab={hasPathwaysTab}
          showLearnerPathwaysAlert={showLearnerPathwaysAlert}
        />
      )}
    </Tab>,

    tabState[DASHBOARD_PROGRAMS_TAB].isVisible && (
      <Tab
        key={DASHBOARD_PROGRAMS_TAB}
        eventKey={DASHBOARD_PROGRAMS_TAB}
        title={intl.formatMessage({
          id: 'enterprise.dashboard.tab.programs',
          defaultMessage: 'Programs',
          description: 'Title for programs tab on enterprise dashboard.',
        })}
        disabled={!tabState[DASHBOARD_PROGRAMS_TAB].isAvailable}
      >
        {activeTab === DASHBOARD_PROGRAMS_TAB && <ProgramListingPage />}
      </Tab>
    ),

    tabState[DASHBOARD_PATHWAYS_TAB].isVisible && (
      <Tab
        key={DASHBOARD_PATHWAYS_TAB}
        eventKey={DASHBOARD_PATHWAYS_TAB}
        title={(
          <>
            {intl.formatMessage({
              id: 'enterprise.dashboard.tab.pathways',
              defaultMessage: 'Pathways',
              description: 'Title for pathways tab on enterprise dashboard.',
            })}
            {hasPathwaysTab && (
              <Badge variant="info" className="ml-2 text-uppercase font-weight-bold">
                {intl.formatMessage({
                  id: 'enterprise.dashboard.tab.pathways.beta',
                  defaultMessage: 'Beta',
                  description: 'Label for the beta badge shown next to the Pathways tab title on the enterprise dashboard when the tab is available.',
                })}
              </Badge>
            )}
          </>
        )}
        disabled={!tabState[DASHBOARD_PATHWAYS_TAB].isAvailable}
      >
        {activeTab === DASHBOARD_PATHWAYS_TAB && (
          isLearnerPathwaysEnabled ? (
            <LearnerPathwaysTab />
          ) : (
            <PathwayProgressListingPage />
          )
        )}
      </Tab>
    ),

    tabState[DASHBOARD_MY_CAREER_TAB].isVisible && (
      <Tab
        key={DASHBOARD_MY_CAREER_TAB}
        eventKey={DASHBOARD_MY_CAREER_TAB}
        title={intl.formatMessage({
          id: 'enterprise.dashboard.tab.my.career',
          defaultMessage: 'My Career',
          description: 'Title for my career tab on enterprise dashboard.',
        })}
      >
        {activeTab === DASHBOARD_MY_CAREER_TAB && (
          <MyCareerTab learnerCurrentJobID={learnerCurrentJobID} />
        )}
      </Tab>
    ),
  ].filter(Boolean)), [
    activeTab,
    hasPathwaysTab,
    intl,
    isLearnerPathwaysEnabled,
    learnerCurrentJobID,
    onSelectHandler,
    showLearnerPathwaysAlert,
    tabState,
  ]);

  return {
    tabs: allTabs,
    onSelectHandler,
    activeTab,
    prefetchTabs,
  };
};

export default useDashboardTabs;
