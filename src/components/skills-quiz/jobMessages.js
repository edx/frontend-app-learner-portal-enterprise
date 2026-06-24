import { defineMessages } from '@edx/frontend-platform/i18n';

const jobMessages = defineMessages({
  currentJobLabel: {
    id: 'enterprise.skills.quiz.currentJob.label',
    defaultMessage: 'I am currently',
    description: 'Label and default title for the current job dropdown in the skills quiz.',
  },
  currentJobSearchPlaceholder: {
    id: 'enterprise.skills.quiz.currentJob.searchPlaceholder',
    defaultMessage: 'Find a current job...',
    description: 'Placeholder for the current job dropdown search input in the skills quiz.',
  },
  currentJobSearchAriaLabel: {
    id: 'enterprise.skills.quiz.currentJob.searchAriaLabel',
    defaultMessage: 'Type to find a current job',
    description: 'Accessible label for the current job dropdown search input in the skills quiz.',
  },
  desiredJobLabel: {
    id: 'enterprise.skills.quiz.desiredJob.label',
    defaultMessage: "I'm interested in careers similar to",
    description: 'Label and default title for the desired jobs dropdown in the skills quiz.',
  },
  desiredJobSearchPlaceholder: {
    id: 'enterprise.skills.quiz.desiredJob.searchPlaceholder',
    defaultMessage: 'Find a job...',
    description: 'Placeholder for the desired jobs dropdown search input in the skills quiz.',
  },
  desiredJobSearchAriaLabel: {
    id: 'enterprise.skills.quiz.desiredJob.searchAriaLabel',
    defaultMessage: 'Type to find a job',
    description: 'Accessible label for the desired jobs dropdown search input in the skills quiz.',
  },
});

export default jobMessages;
