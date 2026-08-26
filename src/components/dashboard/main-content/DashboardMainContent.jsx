import {
  breakpoints, MediaQuery, Stack,
} from '@openedx/paragon';

import { CourseEnrollments } from './course-enrollments';
import SupportInformation from '../sidebar/SupportInformation';
import SubsidiesSummary from '../sidebar/SubsidiesSummary';
import CourseEnrollmentsEmptyStateContainer from './course-enrollments/CourseEnrollmentsEmptyStateContainer';
import LearningGoalForm from './LearningGoalForm';

const DashboardMainContent = () => (
  <Stack gap={5}>
    <MediaQuery maxWidth={breakpoints.medium.maxWidth}>
      {matches => (matches && (
        <SubsidiesSummary />
      ))}
    </MediaQuery>
    <LearningGoalForm />
    <div>
      <CourseEnrollments>
        {/* The children below will only be rendered if there are no course enrollments. */}
        <CourseEnrollmentsEmptyStateContainer />
      </CourseEnrollments>
    </div>
    <MediaQuery maxWidth={breakpoints.medium.maxWidth}>
      {matches => (matches && <SupportInformation />)}
    </MediaQuery>
  </Stack>
);

export default DashboardMainContent;
