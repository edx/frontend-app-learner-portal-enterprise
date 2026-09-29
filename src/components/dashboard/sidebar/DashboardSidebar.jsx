import { Card } from '@openedx/paragon';
import PropTypes from 'prop-types';

import SupportInformation from './SupportInformation';
import SubsidiesSummary from './SubsidiesSummary';
import LearnerPortalSidebarMessage from './LearnerPortalSidebarMessage';
import PathwaySidebarMessage from './PathwaySidebarMessage';

// showPathwayMessage defaults to false because DashboardSidebar is also reused by
// src/components/my-career/AddJobRole.jsx, and the TAG-GDPT pathway message (ENT-12339) is
// dashboard-specific — only CoursesTabComponent.jsx opts in.
const DashboardSidebar = ({ showPathwayMessage }) => (
  <div className="mt-3 mt-lg-0">
    <SubsidiesSummary />
    <LearnerPortalSidebarMessage />
    {showPathwayMessage && <PathwaySidebarMessage />}
    <Card>
      <Card.Section>
        <SupportInformation />
      </Card.Section>
    </Card>
  </div>
);

DashboardSidebar.propTypes = {
  showPathwayMessage: PropTypes.bool,
};

DashboardSidebar.defaultProps = {
  showPathwayMessage: false,
};

export default DashboardSidebar;
