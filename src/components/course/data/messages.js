import { defineMessages } from '@edx/frontend-platform/i18n';

/**
 * Messages for the course data layer.
 *
 * The `disabledEnroll*` entries are referenced as message *descriptors* by
 * `REASON_USER_MESSAGES` / `DISABLED_ENROLL_USER_MESSAGES` in `./constants`, and are
 * formatted at the render boundary (`CourseRunCardStatus`) rather than here. The data
 * layer cannot format them itself: `getMissingApplicableSubsidyReason` is a plain
 * function, not a hook, so it has no access to `intl`.
 */
const messages = defineMessages({
  disabledEnrollOrganizationNoFunds: {
    id: 'course.enrollment.disabledReason.organizationNoFunds',
    defaultMessage: "You can't enroll right now because your organization doesn't have enough funds.",
    description: 'Explains that the learner cannot enroll because their organization has insufficient funds.',
  },
  disabledEnrollOrganizationNoFundsNoAdmins: {
    id: 'course.enrollment.disabledReason.organizationNoFunds.noAdmins',
    defaultMessage: "You can't enroll right now because your organization doesn't have enough funds. Contact your administrator about funds.",
    description: 'Explains that the learner cannot enroll because their organization has insufficient funds, when no administrator contact link is available.',
  },
  disabledEnrollLearnerLimitsReached: {
    id: 'course.enrollment.disabledReason.learnerLimitsReached',
    defaultMessage: "You can't enroll right now because of limits set by your organization.",
    description: 'Explains that the learner cannot enroll because they have reached a spend or enrollment limit set by their organization.',
  },
  disabledEnrollContentNotInCatalog: {
    id: 'course.enrollment.disabledReason.contentNotInCatalog',
    defaultMessage: "You can't enroll right now because this course is no longer available in your organization's catalog.",
    description: 'Explains that the learner cannot enroll because the course has been removed from their organization\'s catalog.',
  },
  disabledEnrollEnterpriseOfferExpired: {
    id: 'course.enrollment.disabledReason.enterpriseOfferExpired',
    defaultMessage: "You can't enroll right now because your offer expired.",
    description: 'Explains that the learner cannot enroll because their organization\'s enterprise offer has expired.',
  },
  disabledEnrollSubscriptionExpired: {
    id: 'course.enrollment.disabledReason.subscriptionExpired',
    defaultMessage: "You can't enroll right now because your subscription expired.",
    description: 'Explains that the learner cannot enroll because their subscription has expired.',
  },
  disabledEnrollSubscriptionExpiredNoAdmins: {
    id: 'course.enrollment.disabledReason.subscriptionExpired.noAdmins',
    defaultMessage: "You can't enroll right now because your subscription expired. Contact your administrator for help.",
    description: 'Explains that the learner cannot enroll because their subscription has expired, when no administrator contact link is available.',
  },
  disabledEnrollSubscriptionDeactivated: {
    id: 'course.enrollment.disabledReason.subscriptionDeactivated',
    defaultMessage: "You can't enroll right now because your subscription has been deactivated.",
    description: 'Explains that the learner cannot enroll because their subscription license has been deactivated.',
  },
  disabledEnrollSubscriptionDeactivatedNoAdmins: {
    id: 'course.enrollment.disabledReason.subscriptionDeactivated.noAdmins',
    defaultMessage: "You can't enroll right now because your subscription has been deactivated. Contact your administrator for help.",
    description: 'Explains that the learner cannot enroll because their subscription license has been deactivated, when no administrator contact link is available.',
  },
  disabledEnrollSubscriptionSeatsExhausted: {
    id: 'course.enrollment.disabledReason.subscriptionSeatsExhausted',
    defaultMessage: "You can't enroll right now because your organization doesn't have enough licenses.",
    description: 'Explains that the learner cannot enroll because their organization has run out of subscription licenses.',
  },
  disabledEnrollSubscriptionSeatsExhaustedNoAdmins: {
    id: 'course.enrollment.disabledReason.subscriptionSeatsExhausted.noAdmins',
    defaultMessage: "You can't enroll right now because your organization doesn't have enough licenses. Contact your administrator for help.",
    description: 'Explains that the learner cannot enroll because their organization has run out of subscription licenses, when no administrator contact link is available.',
  },
  disabledEnrollSubscriptionLicenseNotAssigned: {
    id: 'course.enrollment.disabledReason.subscriptionLicenseNotAssigned',
    defaultMessage: "You can't enroll right now because you don't have a subscription license.",
    description: 'Explains that the learner cannot enroll because they have not been assigned a subscription license.',
  },
  disabledEnrollSubscriptionLicenseNotAssignedNoAdmins: {
    id: 'course.enrollment.disabledReason.subscriptionLicenseNotAssigned.noAdmins',
    defaultMessage: "You can't enroll right now because you don't have a subscription license. Contact your administrator for help.",
    description: 'Explains that the learner cannot enroll because they have not been assigned a subscription license, when no administrator contact link is available.',
  },
  disabledEnrollCouponCodeNotAssigned: {
    id: 'course.enrollment.disabledReason.couponCodeNotAssigned',
    defaultMessage: "You can't enroll right now because you don't have a code.",
    description: 'Explains that the learner cannot enroll because they have not been assigned a coupon code.',
  },
  disabledEnrollCouponCodeNotAssignedNoAdmins: {
    id: 'course.enrollment.disabledReason.couponCodeNotAssigned.noAdmins',
    defaultMessage: "You can't enroll right now because you don't have a code. Contact your administrator for help.",
    description: 'Explains that the learner cannot enroll because they have not been assigned a coupon code, when no administrator contact link is available.',
  },
  disabledEnrollCouponCodesExpired: {
    id: 'course.enrollment.disabledReason.couponCodesExpired',
    defaultMessage: "You can't enroll right now because your code(s) expired.",
    description: 'Explains that the learner cannot enroll because their coupon code or codes have expired.',
  },
  disabledEnrollCouponCodesExpiredNoAdmins: {
    id: 'course.enrollment.disabledReason.couponCodesExpired.noAdmins',
    defaultMessage: "You can't enroll right now because your code(s) expired. Contact your administrator for help.",
    description: 'Explains that the learner cannot enroll because their coupon code or codes have expired, when no administrator contact link is available.',
  },
  missingSubsidyReasonLearnAboutLimits: {
    id: 'course.missingSubsidyReason.action.learnAboutLimits',
    defaultMessage: 'Learn about limits',
    description: 'Label for the button linking to help documentation about enrollment and spend limits.',
  },
  missingSubsidyReasonLearnAboutDeactivation: {
    id: 'course.missingSubsidyReason.action.learnAboutDeactivation',
    defaultMessage: 'Learn about deactivation',
    description: 'Label for the button linking to help documentation about deactivated subscription licenses.',
  },
  missingSubsidyReasonContactAdministrator: {
    id: 'course.missingSubsidyReason.action.contactAdministrator',
    defaultMessage: 'Contact administrator',
    description: 'Label for the button that opens an email to the learner\'s enterprise administrator.',
  },
  missingSubsidyReasonContactAdministratorScreenReaderSuffix: {
    id: 'course.missingSubsidyReason.action.contactAdministrator.screenReaderSuffix',
    defaultMessage: 'for help',
    description: 'Screen reader only suffix appended to the "Contact administrator" button label, so it reads "Contact administrator for help".',
  },
  licenseRequestedAlertHeading: {
    id: 'course.licenseRequestedAlert.heading',
    defaultMessage: 'Course requested',
    description: 'Heading of the alert shown when the learner has already requested access to every course in the catalog.',
  },
  licenseRequestedAlertText: {
    id: 'course.licenseRequestedAlert.text',
    defaultMessage: "Your organization's subscription covers all of the courses in this catalog. You have already requested access to all courses.",
    description: 'Body of the alert shown when the learner has already requested access to every course in the catalog.',
  },
});

export default messages;
