import { defineMessages } from '@edx/frontend-platform/i18n';

const messages = defineMessages({
  errorHeadingApology: {
    id: 'executiveEducation.errorPage.heading.apology',
    defaultMessage: 'We\'re sorry.',
    description: 'First half of the executive education error page heading, emphasised separately from the second half.',
  },
  errorHeadingSomethingWentWrong: {
    id: 'executiveEducation.errorPage.heading.somethingWentWrong',
    defaultMessage: 'Something went wrong.',
    description: 'Second half of the executive education error page heading.',
  },
  returnToDashboard: {
    id: 'executiveEducation.errorPage.returnToDashboard',
    defaultMessage: 'Return to dashboard',
    description: 'Label for the button returning the learner to the dashboard they navigated from.',
  },
  helpfulLink: {
    id: 'executiveEducation.errorPage.helpfulLink',
    defaultMessage: 'Helpful link:',
    description: 'Label introducing a link that may help the learner resolve the error.',
  },
});

export default messages;
