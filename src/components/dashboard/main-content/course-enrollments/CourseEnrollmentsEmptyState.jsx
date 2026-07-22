import { FormattedMessage } from '@edx/frontend-platform/i18n';
import { Icon } from '@openedx/paragon';
import { MenuBook } from '@openedx/paragon/icons';
import { Link } from 'react-router-dom';

import { useAcademies, useEnterpriseFeatures } from '../../../app/data';
import { useGroupAssociationsAlert } from './data';
import GoToAcademy from '../../../academies/GoToAcademy';
import NewGroupAssignmentAlert from './NewGroupAssignmentAlert';

const CourseEnrollmentsEmptyState = () => {
  const { data: academies } = useAcademies();
  const { data: enterpriseFeatures } = useEnterpriseFeatures();
  const {
    showNewGroupAssociationAlert,
    dismissGroupAssociationAlert,
    enterpriseCustomer,
  } = useGroupAssociationsAlert();

  if (enterpriseCustomer.disableSearch) {
    return (
      <p>
        <FormattedMessage
          id="enterprise.dashboard.tab.courses.no.enrollments"
          defaultMessage="You are not enrolled in any courses sponsored by {enterpriseName}. Reach out to your administrator for instructions on how to start learning with edX!"
          description="Message shown to a learner on enterprise dashboard when there are no enrollments."
          values={{
            enterpriseName: enterpriseCustomer.name,
          }}
        />
      </p>
    );
  }

  if (enterpriseCustomer.enableOneAcademy && academies?.length === 1) {
    return <GoToAcademy />;
  }

  return (
    <>
      {enterpriseFeatures.enterpriseGroupsV1 && (
        <NewGroupAssignmentAlert
          showAlert={showNewGroupAssociationAlert}
          onClose={dismissGroupAssociationAlert}
          enterpriseCustomer={enterpriseCustomer}
        />
      )}
      <div className="d-flex flex-column align-items-center text-center py-4 w-50 mx-auto">
        <Icon src={MenuBook} className="mb-3" aria-hidden="true" style={{ color: '#312e81', width: '96px', height: '72px' }} />
        <h3 className="mb-2">
          <FormattedMessage
            id="enterprise.dashboard.tab.courses.no.courses.registered.heading"
            defaultMessage="No courses registered yet"
            description="Heading for the default (no enrollments, no admin restrictions) My Courses empty state."
          />
        </h3>
        <p className="mb-0">
          <FormattedMessage
            id="enterprise.dashboard.tab.courses.no.courses.registered.body"
            defaultMessage="Once you enroll in a course, it will appear here. Start by {exploringCoursesLink} or building your personalized pathway above."
            description="Body for the default My Courses empty state, with an inline link to course search."
            values={{
              exploringCoursesLink: (
                <Link to={`/${enterpriseCustomer.slug}/search`}>
                  <FormattedMessage
                    id="enterprise.dashboard.tab.courses.no.courses.registered.explore.link"
                    defaultMessage="exploring courses"
                    description="Inline link text within the default My Courses empty-state body sentence."
                  />
                </Link>
              ),
            }}
          />
        </p>
      </div>
    </>
  );
};

export default CourseEnrollmentsEmptyState;
