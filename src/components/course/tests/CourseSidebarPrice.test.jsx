import React from 'react';
import { screen, render } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';

import { AppContext } from '@edx/frontend-platform/react';
import { CourseContextProvider } from '../CourseContextProvider';
import { UserSubsidyContext } from '../../enterprise-user-subsidy/UserSubsidy';
import CourseSidebarPrice from '../CourseSidebarPrice';
import { LICENSE_SUBSIDY_TYPE } from '../data/constants';

const initialAppState = {
  enterpriseConfig: {
    slug: 'test-enterprise-slug',
  },
};

const BASE_COURSE_STATE = {
  activeCourseRun: {
    firstEnrollablePaidSeatPrice: 1,
  },
  userSubsidy: {},
  course: {},
  userEnrollments: [],
  userEntitlements: [],
  catalog: [],
};

const courseStateWithLicenseSubsidy = {
  ...BASE_COURSE_STATE,
  userSubsidy: { subsidyType: LICENSE_SUBSIDY_TYPE },
};

const courseStateWithOffersNoLicenseSubsidy = {
  ...BASE_COURSE_STATE,
  catalog: { catalogList: ['bears'] },
};

const courseStateWithNoOffersNoLicenseSubsidy = {
  ...BASE_COURSE_STATE,
  catalog: { catalogList: ['bears'] },
};

// eslint-disable-next-line react/prop-types
const SidebarWithContext = ({ initialState, userSubsidyState = { offers: [] } }) => (
  <AppContext.Provider value={initialAppState}>
    <CourseContextProvider initialState={initialState}>
      <UserSubsidyContext.Provider value={userSubsidyState}>
        <CourseSidebarPrice />
      </UserSubsidyContext.Provider>
    </CourseContextProvider>
  </AppContext.Provider>
);

describe('Sidebar price for various use cases', () => {
  const SUBSIDY_WITH_MATCHING_OFFER = {
    offers: {
      offers: [{
        code: 'bearsRus', catalog: 'bears', benefitValue: 100, usageType: 'Percentage',
      }],
    },
  };
  const SUBSIDY_WITHOUT_MATCHING_OFFER = {
    offers: {
      offers: [{
        code: 'bearsRus', catalog: 'bulls', benefitValue: 100, usageType: 'Percentage',
      }],
    },
  };
  test('when license subsidy is found, must show subscription price and message', () => {
    render(<SidebarWithContext initialState={courseStateWithLicenseSubsidy} />);
    expect(screen.getByText('Included in your subscription')).toBeInTheDocument();
  });
  test('when license subsidy is absent, but offer found, must show offer price and message', () => {
    render(<SidebarWithContext
      initialState={courseStateWithOffersNoLicenseSubsidy}
      userSubsidyState={SUBSIDY_WITH_MATCHING_OFFER}
    />);
    expect(screen.getByText('Sponsored by')).toBeInTheDocument();
  });
  test('when license subsidy is absent, and matching offer not found, must show original price and message', () => {
    render(<SidebarWithContext
      initialState={courseStateWithOffersNoLicenseSubsidy}
      userSubsidyState={SUBSIDY_WITHOUT_MATCHING_OFFER}
    />);
    expect(screen.queryByText('Sponsored by')).not.toBeInTheDocument();
    expect(screen.getByText(/\$1.00/)).toBeInTheDocument();
  });
  test('when license subsidy and offers are absent, must show original price and message', () => {
    render(<SidebarWithContext initialState={courseStateWithNoOffersNoLicenseSubsidy} />);
    expect(screen.getByText(/\$1.00/)).toBeInTheDocument();
    expect(screen.queryByText('Sponsored by')).not.toBeInTheDocument();
    expect(screen.queryByText('Included in your subscription')).not.toBeInTheDocument();
  });
});