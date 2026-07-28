import { defineMessages } from '@edx/frontend-platform/i18n';

const messages = defineMessages({
  loggedOutTitle: {
    id: 'root.loggedOut.title',
    defaultMessage: 'You are now logged out.',
    description: 'Heading of the page shown after the learner signs out.',
  },
  loggedOutBody: {
    id: 'root.loggedOut.body',
    defaultMessage: 'Please log back in {loginLink}',
    description: 'Body copy shown after the learner signs out. {loginLink} is a link labelled "here."',
  },
  loggedOutLoginLinkText: {
    id: 'root.loggedOut.login.linkText',
    defaultMessage: 'here.',
    description: 'Label for the link that returns the learner to the sign in page.',
  },
});

export default messages;
