import {
  Row,
  MediaQuery,
  breakpoints,
} from '@openedx/paragon';
import PropTypes from 'prop-types';
import { MainContent, Sidebar } from '../../layout';
import CourseEnrollmentFailedAlert, { ENROLLMENT_SOURCE } from '../../course/CourseEnrollmentFailedAlert';
import DashboardMainContent from './DashboardMainContent';
import PathwayStatusAlertScaffold from './PathwayStatusAlertScaffold';
import { DashboardSidebar } from '../sidebar';

const CoursesTabComponent = ({
  onOpenPathwaysTab,
  shouldShowPathwayStatusAlert,
}) => (
  <Row className="py-5">
    <CourseEnrollmentFailedAlert className="mt-0 mb-3" enrollmentSource={ENROLLMENT_SOURCE.DASHBOARD} />
    {shouldShowPathwayStatusAlert && (
      <PathwayStatusAlertScaffold className="mb-3" onOpenPathwaysTab={onOpenPathwaysTab} />
    )}
    <MainContent>
      <DashboardMainContent />
    </MainContent>
    <MediaQuery minWidth={breakpoints.large.minWidth}>
      {matches => (matches && (
        <Sidebar data-testid="courses-tab-sidebar">
          <DashboardSidebar />
        </Sidebar>
      ))}
    </MediaQuery>
  </Row>
);

CoursesTabComponent.defaultProps = {
  shouldShowPathwayStatusAlert: false,
};

CoursesTabComponent.propTypes = {
  onOpenPathwaysTab: PropTypes.func.isRequired,
  shouldShowPathwayStatusAlert: PropTypes.bool,
};

export default CoursesTabComponent;
