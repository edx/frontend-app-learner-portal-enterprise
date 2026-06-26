import { defineMessages } from '@edx/frontend-platform/i18n';

const messages = defineMessages({
  adjustMyPathway: {
    id: 'learner.pathways.courses.actions.adjust',
    defaultMessage: 'Adjust my pathway',
    description: 'Primary action to rebuild the learner pathway from the quiz.',
  },
  viewProfile: {
    id: 'learner.pathways.courses.actions.viewProfile',
    defaultMessage: 'View profile',
    description: 'Secondary action to return to the career-selection profile page.',
  },
  viewOnboardingQuiz: {
    id: 'learner.pathways.courses.actions.viewQuiz',
    defaultMessage: 'View onboarding quiz',
    description: 'Tertiary action to return to the onboarding quiz.',
  },
});

export default messages;
