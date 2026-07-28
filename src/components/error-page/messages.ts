import { defineMessages } from '@edx/frontend-platform/i18n';

const messages = defineMessages({
  helmetTitle: {
    id: 'errorPage.helmet.title',
    defaultMessage: 'Error | edX',
    description: 'Browser tab title for the generic error page.',
  },
  defaultTitle: {
    id: 'errorPage.title.default',
    defaultMessage: 'Error occurred while processing your request',
    description: 'Default heading of the error page, used when no specific title is supplied.',
  },
  logoAltText: {
    id: 'errorPage.header.logo.altText',
    defaultMessage: 'edX logo',
    description: 'Alternative text for the edX logo in the error page header.',
  },
  secondaryNavAriaLabel: {
    id: 'errorPage.header.secondaryNav.ariaLabel',
    defaultMessage: 'Secondary',
    description: 'Accessible label for the secondary navigation in the error page header.',
  },
  help: {
    id: 'errorPage.header.help',
    defaultMessage: 'Help',
    description: 'Label for the link to the learner support site in the error page header.',
  },
  signOut: {
    id: 'errorPage.header.signOut',
    defaultMessage: 'Sign out',
    description: 'Label for the sign out option in the error page header account menu.',
  },
});

export default messages;
