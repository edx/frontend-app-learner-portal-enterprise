import { defineMessages } from '@edx/frontend-platform/i18n';

const messages = defineMessages({
  licenseActivationTitle: {
    id: 'licenseActivation.notFound.title',
    defaultMessage: 'Oops!',
    description: 'Heading of the page shown when no subscription license is assigned to the learner\'s account.',
  },
  licenseActivationSpannedTitle: {
    id: 'licenseActivation.notFound.spannedTitle',
    defaultMessage: 'We can\'t find a license assigned to this account.',
    description: 'Subheading of the page shown when no subscription license is assigned to the learner\'s account.',
  },
  licenseActivationHelmetTitle: {
    id: 'licenseActivation.notFound.helmet.title',
    defaultMessage: 'License not found',
    description: 'Browser tab title for the page shown when no subscription license is assigned to the learner\'s account.',
  },
  licenseActivationLoggedInAs: {
    id: 'licenseActivation.notFound.loggedInAs',
    defaultMessage: 'You are currently logged in as {email}.',
    description: 'Tells the learner which email address they are currently signed in with. {email} is the learner\'s email address.',
  },
  licenseActivationResolutionsHeading: {
    id: 'licenseActivation.notFound.resolutions.heading',
    defaultMessage: 'You can try one of the following to resolve and access your subscription license:',
    description: 'Heading introducing the list of ways a learner can resolve a missing subscription license.',
  },
  licenseActivationLogOutResolution: {
    id: 'licenseActivation.notFound.resolutions.logOut',
    defaultMessage: '{logOutLink}, then sign back in with the email address connected to your subscription license.',
    description: 'Suggested resolution for a missing subscription license. {logOutLink} is a link labelled "Log out".',
  },
  licenseActivationLogOutLinkText: {
    id: 'licenseActivation.notFound.resolutions.logOut.linkText',
    defaultMessage: 'Log out',
    description: 'Label for the link that signs the learner out of their account.',
  },
  licenseActivationCreateAccountResolution: {
    id: 'licenseActivation.notFound.resolutions.createAccount',
    defaultMessage: 'Create an account using the email address associated with your subscription license.',
    description: 'Suggested resolution for a missing subscription license.',
  },
  licenseActivationUpdateEmailResolution: {
    id: 'licenseActivation.notFound.resolutions.updateEmail',
    defaultMessage: '{updateEmailLink} on your existing account to the email address associated with your subscription license.',
    description: 'Suggested resolution for a missing subscription license. {updateEmailLink} is a link labelled "Update the email address".',
  },
  licenseActivationUpdateEmailLinkText: {
    id: 'licenseActivation.notFound.resolutions.updateEmail.linkText',
    defaultMessage: 'Update the email address',
    description: 'Label for the link to the learner\'s account settings, where they can change their email address.',
  },
  enterpriseInviteSubtitle: {
    id: 'enterpriseInvite.error.subtitle',
    defaultMessage: 'We couldn\'t link your edX account to your organization',
    description: 'Subheading of the error page shown when linking a learner\'s account to their organization fails.',
  },
  enterpriseInviteBody: {
    id: 'enterpriseInvite.error.body',
    defaultMessage: 'Please reach out to your edX administrator or visit the {helpCenterLink} to resolve the error and gain access to subsidized content, or continue to {marketingSiteLink} to start learning on your own.',
    description: 'Body copy of the error page shown when linking a learner\'s account to their organization fails. {helpCenterLink} is a link labelled "edX Help Center" and {marketingSiteLink} is a link labelled "edX.org".',
  },
  enterpriseInviteHelpCenterLinkText: {
    id: 'enterpriseInvite.error.helpCenter.linkText',
    defaultMessage: 'edX Help Center',
    description: 'Label for the link to the edX Help Center.',
  },
  enterpriseInviteMarketingSiteLinkText: {
    id: 'enterpriseInvite.error.marketingSite.linkText',
    defaultMessage: 'edX.org',
    description: 'Label for the inline link to the edX marketing site.',
  },
  enterpriseInviteContinueCta: {
    id: 'enterpriseInvite.error.continueCta',
    defaultMessage: 'Continue to edX.org',
    description: 'Label for the button that takes the learner to the edX marketing site.',
  },
});

export default messages;
