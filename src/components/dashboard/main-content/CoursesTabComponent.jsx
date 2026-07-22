import {
  Row,
  MediaQuery,
  breakpoints,
} from '@openedx/paragon';
import PropTypes from 'prop-types';
import { MainContent, Sidebar } from '../../layout';
import CourseEnrollmentFailedAlert, { ENROLLMENT_SOURCE } from '../../course/CourseEnrollmentFailedAlert';
import DashboardMainContent from './DashboardMainContent';
import { DashboardSidebar } from '../sidebar';
import { LearnerPathwaysAlertContainer } from './learner-pathways/courses-tab-alert';

/**
 * @typedef {Object} CoursesTabComponentProps
 * @property {(tabName: string) => void} onSelectTab
 *   Callback used by the learner pathways alert to switch dashboard tabs.
 * @property {boolean} [hasPathwaysTab=false]
 *   Indicates whether the Pathways tab is enabled and available.
 * @property {boolean} [showLearnerPathwaysAlert=false]
 *   Feature-gated toggle to render the learner pathways alert scaffold.
 */

/**
 * Courses tab layout wrapper for dashboard content and sidebar.
 *
 * The learner pathways alert is intentionally rendered full-width above both
 * columns to match design behavior and avoid coupling to `MainContent` width.
 *
 * @param {CoursesTabComponentProps} props
 * @returns {JSX.Element}
 */
const CoursesTabComponent = ({
  onSelectTab,
  hasPathwaysTab,
  showLearnerPathwaysAlert,
}) => (
  <Row className="py-5">
    <div className="w-100">
      <CourseEnrollmentFailedAlert className="mt-0 mb-3" enrollmentSource={ENROLLMENT_SOURCE.DASHBOARD} />
      {showLearnerPathwaysAlert && (
        <LearnerPathwaysAlertContainer
          onSelectTab={onSelectTab}
          hasPathwaysTab={hasPathwaysTab}
        />
      )}
    </div>
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

CoursesTabComponent.propTypes = {
  onSelectTab: PropTypes.func.isRequired,
  hasPathwaysTab: PropTypes.bool,
  showLearnerPathwaysAlert: PropTypes.bool,
};

CoursesTabComponent.defaultProps = {
  hasPathwaysTab: false,
  showLearnerPathwaysAlert: false,
};

export default CoursesTabComponent;
