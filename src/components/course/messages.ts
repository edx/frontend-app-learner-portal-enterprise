import { defineMessages } from '@edx/frontend-platform/i18n';

const messages = defineMessages({
  enrollmentFailedDscDenied: {
    id: 'course.enrollmentFailedAlert.enrollment.dscDenied',
    defaultMessage: 'You were not enrolled in your selected course. In order to enroll, you must accept the data sharing consent terms. Please {contactHelpText} for further information.',
    description: 'Alert shown when enrollment failed because the learner declined the data sharing consent terms. {contactHelpText} is a link prompting the learner to contact their administrator.',
  },
  enrollmentFailedVerifiedModeUnavailable: {
    id: 'course.enrollmentFailedAlert.enrollment.verifiedModeUnavailable',
    defaultMessage: 'You were not enrolled in your selected course as the verified course mode is unavailable. Please {contactHelpText} for further information.',
    description: 'Alert shown when enrollment failed because the verified course mode is unavailable. {contactHelpText} is a link prompting the learner to contact their administrator.',
  },
  enrollmentFailedDefault: {
    id: 'course.enrollmentFailedAlert.enrollment.default',
    defaultMessage: 'You were not enrolled in your selected course. Please {contactHelpText} for further information.',
    description: 'Alert shown when enrollment failed for an unspecified reason. {contactHelpText} is a link prompting the learner to contact their administrator.',
  },
  upgradeFailedDscDeniedFromDashboard: {
    id: 'course.enrollmentFailedAlert.upgrade.dscDenied.fromDashboard',
    defaultMessage: 'You were not able to access your selected course. To access the course, please select "Continue learning" under your course and accept the data sharing consent terms.',
    description: 'Alert shown on the dashboard when course access failed because the learner declined the data sharing consent terms. "Continue learning" is the label of a button on the learner dashboard.',
  },
  upgradeFailedDscDeniedFromCoursePage: {
    id: 'course.enrollmentFailedAlert.upgrade.dscDenied.fromCoursePage',
    defaultMessage: 'You were not able to access your selected course. To access the course, please accept the data sharing consent terms.',
    description: 'Alert shown on the course page when course access failed because the learner declined the data sharing consent terms.',
  },
  upgradeFailedVerifiedModeUnavailable: {
    id: 'course.enrollmentFailedAlert.upgrade.verifiedModeUnavailable',
    defaultMessage: 'You were not able to access your selected course as the verified course mode is unavailable. Please {contactHelpText} for further information.',
    description: 'Alert shown when course access failed because the verified course mode is unavailable. {contactHelpText} is a link prompting the learner to contact their administrator.',
  },
  upgradeFailedDefault: {
    id: 'course.enrollmentFailedAlert.upgrade.default',
    defaultMessage: 'You were not able to access your selected course. Please {contactHelpText} for further information.',
    description: 'Alert shown when course access failed for an unspecified reason. {contactHelpText} is a link prompting the learner to contact their administrator.',
  },
});

export default messages;
