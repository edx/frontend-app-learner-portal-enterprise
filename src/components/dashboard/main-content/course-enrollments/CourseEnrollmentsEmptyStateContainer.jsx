import { FormattedMessage } from '@edx/frontend-platform/i18n';
import { getConfig } from '@edx/frontend-platform/config';

import { useAcademies, useEnterpriseFeatures } from '../../../app/data';
import { useGroupAssociationsAlert } from './data';
import LegacyCourseEnrollmentsEmptyState from './LegacyCourseEnrollmentsEmptyState';
import GoToAcademy from '../../../academies/GoToAcademy';
import NewGroupAssignmentAlert from './NewGroupAssignmentAlert';
import { isLearnerPathwaysEnabledForEnterpriseCustomer } from '../../data/utils';
import CourseEnrollmentsEmptyState from './CourseEnrollmentsEmptyState';

const CourseEnrollmentsEmptyStateContainer = () => {
  const { data: academies } = useAcademies();
  const { data: enterpriseFeatures } = useEnterpriseFeatures();
  const {
    showNewGroupAssociationAlert,
    dismissGroupAssociationAlert,
    enterpriseCustomer,
  } = useGroupAssociationsAlert();

  const isLearnerPathwaysEnabled = !!enterpriseFeatures?.enterpriseAiPathwaysOperatorEnabled
    && isLearnerPathwaysEnabledForEnterpriseCustomer(
      enterpriseCustomer.uuid,
      getConfig().FEATURE_ENABLE_LEARNER_PATHWAYS_FOR_ENTERPRISE_CUSTOMERS,
    );

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
      {isLearnerPathwaysEnabled ? (
        <CourseEnrollmentsEmptyState />
      ) : (
        <LegacyCourseEnrollmentsEmptyState />
      )}
    </>
  );
};

export default CourseEnrollmentsEmptyStateContainer;
