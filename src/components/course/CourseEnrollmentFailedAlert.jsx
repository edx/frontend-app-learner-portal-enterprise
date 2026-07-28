import { useMemo } from 'react';
import PropTypes from 'prop-types';
import { useLocation } from 'react-router-dom';
import { Container, Alert } from '@openedx/paragon';
import { Error } from '@openedx/paragon/icons';
import { FormattedMessage } from '@edx/frontend-platform/i18n';

import { useRenderContactHelpText } from '../../utils/hooks';
import messages from './messages';
import {
  ENROLLMENT_COURSE_RUN_KEY_QUERY_PARAM,
  ENROLLMENT_FAILED_QUERY_PARAM,
  ENROLLMENT_FAILURE_REASON_QUERY_PARAM,
} from './data/constants';
import { useEnterpriseCourseEnrollments, useEnterpriseCustomer } from '../app/data';

export const ENROLLMENT_SOURCE = {
  DASHBOARD: 'DASHBOARD',
  COURSE_PAGE: 'COURSE_PAGE',
};

const createEnrollmentFailureMessages = (contactHelpText) => ({
  dsc_denied: <FormattedMessage {...messages.enrollmentFailedDscDenied} values={{ contactHelpText }} />,
  verified_mode_unavailable: (
    <FormattedMessage {...messages.enrollmentFailedVerifiedModeUnavailable} values={{ contactHelpText }} />
  ),
  default: <FormattedMessage {...messages.enrollmentFailedDefault} values={{ contactHelpText }} />,
});

const createUpgradeFailureMessages = (contactHelpText, enrollmentSource) => ({
  dsc_denied: (
    <FormattedMessage
      {...(enrollmentSource === ENROLLMENT_SOURCE.DASHBOARD
        ? messages.upgradeFailedDscDeniedFromDashboard
        : messages.upgradeFailedDscDeniedFromCoursePage)}
    />
  ),
  verified_mode_unavailable: (
    <FormattedMessage {...messages.upgradeFailedVerifiedModeUnavailable} values={{ contactHelpText }} />
  ),
  default: <FormattedMessage {...messages.upgradeFailedDefault} values={{ contactHelpText }} />,
});

/**
 * A component to render an alert when a learner fails to enroll in a course for any number of
 * reasons. The contents of the alert are determined by a ``failureReason`` which is passed
 * from the Data Sharing Consent (DSC) page as a query parameter.
 */
const CourseEnrollmentFailedAlert = ({ className, enrollmentSource }) => {
  const { search } = useLocation();
  const { data: enterpriseCustomer } = useEnterpriseCustomer();
  const renderContactHelpText = useRenderContactHelpText(enterpriseCustomer);
  const { data: { allEnrollmentsByStatus } } = useEnterpriseCourseEnrollments();

  const [hasEnrollmentFailed, failureReason, courseRunKey] = useMemo(
    () => {
      const searchParams = new URLSearchParams(search);
      return [
        searchParams.get(ENROLLMENT_FAILED_QUERY_PARAM),
        searchParams.get(ENROLLMENT_FAILURE_REASON_QUERY_PARAM),
        searchParams.get(ENROLLMENT_COURSE_RUN_KEY_QUERY_PARAM),
      ];
    },
    [search],
  );

  const isUpgradeAttempt = useMemo(
    () => !!(Object.values(allEnrollmentsByStatus).flat()).find(
      enrollment => enrollment.courseRunId === courseRunKey,
    ),
    [allEnrollmentsByStatus, courseRunKey],
  );

  const failureReasonMessages = useMemo(
    () => {
      const contactHelpText = renderContactHelpText(Alert.Link);
      return isUpgradeAttempt ? createUpgradeFailureMessages(contactHelpText, enrollmentSource)
        : createEnrollmentFailureMessages(contactHelpText);
    },
    [enrollmentSource, isUpgradeAttempt, renderContactHelpText],
  );

  if (!hasEnrollmentFailed) {
    return null;
  }

  return (
    <Container size="lg" className={className}>
      <Alert variant="danger" icon={Error}>
        {failureReasonMessages[failureReason] || failureReasonMessages.default}
      </Alert>
    </Container>
  );
};

CourseEnrollmentFailedAlert.defaultProps = {
  className: 'mt-3',
};

CourseEnrollmentFailedAlert.propTypes = {
  className: PropTypes.string,
  enrollmentSource: PropTypes.oneOf(
    Object.values(ENROLLMENT_SOURCE),
  ).isRequired,
};

export default CourseEnrollmentFailedAlert;
