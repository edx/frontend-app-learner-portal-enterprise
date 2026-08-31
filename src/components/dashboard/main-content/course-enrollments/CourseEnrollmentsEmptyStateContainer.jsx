import PropTypes from 'prop-types';
import { FormattedMessage } from '@edx/frontend-platform/i18n';
import { getConfig } from '@edx/frontend-platform/config';

import { useAcademies, useCanViewAcademies, useEnterpriseFeatures } from '../../../app/data';
import { useGroupAssociationsAlert } from './data';
import LegacyCourseEnrollmentsEmptyState from './LegacyCourseEnrollmentsEmptyState';
import GoToAcademy from '../../../academies/GoToAcademy';
import NewGroupAssignmentAlert from './NewGroupAssignmentAlert';
import { isLearnerPathwaysEnabledForEnterpriseCustomer } from '../../data/utils';
import CourseEnrollmentsEmptyState from './CourseEnrollmentsEmptyState';

/**
 * Renders the "Go to Academy" empty state when the customer has exactly one academy, falling
 * back to the given empty state otherwise. Rendered only for academy-eligible learners so that
 * the academies list is never fetched for ineligible customers.
 */
const SingleAcademyEmptyState = ({ fallback }) => {
  const { data: academies } = useAcademies();
  if (academies?.length !== 1) {
    return fallback;
  }
  return <GoToAcademy />;
};

SingleAcademyEmptyState.propTypes = {
  fallback: PropTypes.node.isRequired,
};

const CourseEnrollmentsEmptyStateContainer = () => {
  const canViewAcademies = useCanViewAcademies();
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

  const defaultEmptyState = (
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

  if (canViewAcademies && enterpriseCustomer.enableOneAcademy) {
    return <SingleAcademyEmptyState fallback={defaultEmptyState} />;
  }

  return defaultEmptyState;
};

export default CourseEnrollmentsEmptyStateContainer;
