import React from 'react';
import thunk from 'redux-thunk';
import configureMockStore from 'redux-mock-store';
import '@testing-library/jest-dom/extend-expect';
import { screen } from '@testing-library/react';
import { AppContext } from '@edx/frontend-platform/react';
import { Provider as ReduxProvider } from 'react-redux';
import { breakpoints } from '@edx/paragon';
import { UserSubsidyContext } from '../../enterprise-user-subsidy';
import { CourseContextProvider } from '../../course/CourseContextProvider';
import { COURSE_PACING_MAP } from '../../course/data/constants';
import { TEST_OWNER } from '../../course/tests/data/constants';

import {
  renderWithRouter, fakeReduxStore,
} from '../../../utils/tests';
import Dashboard, { LICENCE_ACTIVATION_MESSAGE } from '../Dashboard';
import {
  SUBSCRIPTION_EXPIRED_MODAL_TITLE,
  SUBSCRIPTION_EXPIRING_MODAL_TITLE,
} from '../SubscriptionExpirationModal';

const mockStore = configureMockStore([thunk]);

/* eslint-disable react/prop-types */
const DashboardWithContext = ({
  initialAppState = {},
  initialUserSubsidyState = {},
  initialCourseState = {},
  initialReduxStore = fakeReduxStore,
}) => (
  <AppContext.Provider value={initialAppState}>
    <UserSubsidyContext.Provider value={initialUserSubsidyState}>
      <CourseContextProvider initialState={initialCourseState}>
        <ReduxProvider store={mockStore(initialReduxStore)}>
          <Dashboard />
        </ReduxProvider>
      </CourseContextProvider>
    </UserSubsidyContext.Provider>
  </AppContext.Provider>
);
/* eslint-enable react/prop-types */

let mockLocation = {
  pathname: '/welcome',
  hash: '',
  search: '',
  state: { activationSuccess: true },
};

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useLocation: () => (mockLocation),
}));

jest.mock('@edx/frontend-platform/auth', () => ({
  ...jest.requireActual('@edx/frontend-platform/auth'),
  getAuthenticatedUser: () => ({ username: 'myspace-tom' }),
}));

describe('<Dashboard />', () => {
  const defaultOffersState = {
    offers: [],
    loading: false,
    offersCount: 0,
  };
  const initialAppState = {
    enterpriseConfig: {
      name: 'BearsRUs',
    },
    subscriptionPlan: {
      expirationDate: '2020-10-25',
      daysUntilExpiration: 365,
    },
  };
  const initialUserSubsidyState = {
    hasAccessToPortal: true,
    offers: defaultOffersState,
  };
  const mockWindowConfig = {
    type: 'screen',
    width: breakpoints.large.minWidth + 1,
    height: 800,
  };
  const initialCourseState = {
    course: {
      subjects: [{
        name: 'Test Subject 1',
        slug: 'test-subject-slug',
      }],
      shortDescription: 'Course short description.',
      title: 'Test Course Title',
      owners: [TEST_OWNER],
      programs: [],
      image: {
        src: 'http://test-image.url',
      },
    },
    activeCourseRun: {
      isEnrollable: true,
      key: 'test-course-run-key',
      pacingType: COURSE_PACING_MAP.SELF_PACED,
      start: '2020-09-09T04:00:00Z',
      availability: 'Current',
      courseUuid: 'Foo',
    },
    userEnrollments: [],
    userEntitlements: [],
    catalog: {
      containsContentItems: true,
    },
  };
  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('renders license activation alert on activation success', () => {
    renderWithRouter(
      <DashboardWithContext initialAppState={initialAppState} initialUserSubsidyState={initialUserSubsidyState} />,
      { route: '/?activationSuccess=true' },
    );
    expect(screen.getByText(LICENCE_ACTIVATION_MESSAGE)).toBeTruthy();
  });
  it('does not render license activation alert without activation success', () => {
    // NOTE: This modifies the original mockLocation
    mockLocation = { ...mockLocation, state: { activationSuccess: false } };
    renderWithRouter(
      <DashboardWithContext initialAppState={initialAppState} initialUserSubsidyState={initialUserSubsidyState} />,
    );
    expect(screen.queryByText(LICENCE_ACTIVATION_MESSAGE)).toBeFalsy();
  });
  it('does not render subscription expiration modal when >60 days of access remain', () => {
    renderWithRouter(
      <DashboardWithContext
        initialAppState={initialAppState}
        initialUserSubsidyState={initialUserSubsidyState}
        initialCourseState={initialCourseState}
      />,
    );
    expect(screen.queryByText(SUBSCRIPTION_EXPIRING_MODAL_TITLE)).toBeFalsy();
    expect(screen.queryByText(SUBSCRIPTION_EXPIRED_MODAL_TITLE)).toBeFalsy();
  });
  it('renders the subscription expiration warning modal when 60 >= daysUntilExpiration > 0', () => {
    const expiringSubscriptionAppState = {
      ...initialAppState,
      subscriptionPlan: {
        ...initialAppState.subscriptionPlan,
        daysUntilExpiration: 60,
      },
    };
    renderWithRouter(
      <DashboardWithContext
        initialAppState={expiringSubscriptionAppState}
        initialUserSubsidyState={initialUserSubsidyState}
        initialCourseState={initialCourseState}
      />,
    );
    expect(screen.queryByText(SUBSCRIPTION_EXPIRING_MODAL_TITLE)).toBeTruthy();
    expect(screen.queryByText(SUBSCRIPTION_EXPIRED_MODAL_TITLE)).toBeFalsy();
  });
  it('renders the subscription expired modal when 0 >= daysUntilExpiration', () => {
    const expiringSubscriptionAppState = {
      ...initialAppState,
      subscriptionPlan: {
        ...initialAppState.subscriptionPlan,
        daysUntilExpiration: 0,
      },
    };
    renderWithRouter(
      <DashboardWithContext
        initialAppState={expiringSubscriptionAppState}
        initialUserSubsidyState={initialUserSubsidyState}
        initialCourseState={initialCourseState}
      />,
    );
    expect(screen.queryByText(SUBSCRIPTION_EXPIRING_MODAL_TITLE)).toBeFalsy();
    expect(screen.queryByText(SUBSCRIPTION_EXPIRED_MODAL_TITLE)).toBeTruthy();
  });
  it('renders the sidebar', () => {
    renderWithRouter(
      <DashboardWithContext
        initialAppState={initialAppState}
        initialUserSubsidyState={initialUserSubsidyState}
      />,
    );
    expect(screen.getByTestId('sidebar')).toBeTruthy();
  });
});
