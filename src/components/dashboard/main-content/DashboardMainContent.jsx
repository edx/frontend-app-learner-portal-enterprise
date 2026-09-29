import {
  breakpoints, MediaQuery, Stack,
} from '@openedx/paragon';

import { CourseEnrollments } from './course-enrollments';
import SupportInformation from '../sidebar/SupportInformation';
import SubsidiesSummary from '../sidebar/SubsidiesSummary';
import LearnerPortalSidebarMessage from '../sidebar/LearnerPortalSidebarMessage';
import PathwaySidebarMessage from '../sidebar/PathwaySidebarMessage';
import CourseEnrollmentsEmptyStateContainer from './course-enrollments/CourseEnrollmentsEmptyStateContainer';

const DashboardMainContent = () => (
  <Stack gap={5}>
    <MediaQuery maxWidth={breakpoints.medium.maxWidth}>
      {matches => (matches && (
        <SubsidiesSummary />
      ))}
    </MediaQuery>
    <div>
      <CourseEnrollments>
        {/* The children below will only be rendered if there are no course enrollments. */}
        <CourseEnrollmentsEmptyStateContainer />
      </CourseEnrollments>
    </div>
    <MediaQuery maxWidth={breakpoints.medium.maxWidth}>
      {matches => (matches && (
        // className="" here: these cards' mb-3/mt-3 margins are meant for the plain block
        // layout in DashboardSidebar (desktop), where adjacent margins collapse. Inside this
        // Stack's flexbox gap, margins don't collapse and would stack on top of the gap,
        // making mobile spacing visibly larger than desktop for no reason.
        <>
          <LearnerPortalSidebarMessage className="" />
          <PathwaySidebarMessage className="" />
          <SupportInformation />
        </>
      ))}
    </MediaQuery>
  </Stack>
);

export default DashboardMainContent;
