import { defineMessages } from '@edx/frontend-platform/i18n';

const messages = defineMessages({
  title: {
    id: 'learner.pathways.courses.title',
    defaultMessage: 'Your Personalized Learning Pathway',
    description: 'Page title for the pathway courses page.',
  },
  betaLabel: {
    id: 'learner.pathways.courses.betaLabel',
    defaultMessage: 'Beta',
    description: 'Badge label indicating the pathway courses page is a beta feature.',
  },
  instructions: {
    id: 'learner.pathways.courses.instructions',
    defaultMessage: 'Based on your goals and background, here are the courses we recommend.',
    description: 'Instructional copy shown below the pathway courses page title.',
  },
  completedLabel: {
    id: 'learner.pathways.courses.completedLabel',
    defaultMessage: 'Completed',
    description: 'Label for the completed courses metric in the pathway progress summary.',
  },
  inProgressLabel: {
    id: 'learner.pathways.courses.inProgressLabel',
    defaultMessage: 'In progress',
    description: 'Label for the in-progress courses metric in the pathway progress summary.',
  },
  upcomingLabel: {
    id: 'learner.pathways.courses.upcomingLabel',
    defaultMessage: 'Upcoming',
    description: 'Label for the upcoming courses metric in the pathway progress summary.',
  },
  totalCoursesLabel: {
    id: 'learner.pathways.courses.totalCoursesLabel',
    defaultMessage: 'Total courses',
    description: 'Label for the total courses metric in the pathway progress summary.',
  },
  statusColumn: {
    id: 'learner.pathways.courses.statusColumn',
    defaultMessage: 'Status',
    description: 'Column header for course status in the pathway courses table.',
  },
  courseColumn: {
    id: 'learner.pathways.courses.courseColumn',
    defaultMessage: 'Course',
    description: 'Column header for course title in the pathway courses table.',
  },
  levelColumn: {
    id: 'learner.pathways.courses.levelColumn',
    defaultMessage: 'Level',
    description: 'Column header for course level in the pathway courses table.',
  },
  whyThisFitsYouColumn: {
    id: 'learner.pathways.courses.whyThisFitsYouColumn',
    defaultMessage: 'Why this fits you',
    description: 'Column header for the "why this fits you" reasoning in the pathway courses table.',
  },
  lengthColumn: {
    id: 'learner.pathways.courses.lengthColumn',
    defaultMessage: 'Length',
    description: 'Column header for course length in the pathway courses table.',
  },
  actionColumn: {
    id: 'learner.pathways.courses.actionColumn',
    defaultMessage: 'Action',
    description: 'Column header for the row-level action button in the pathway courses table.',
  },
  statusCompleted: {
    id: 'learner.pathways.courses.statusCompleted',
    defaultMessage: 'Completed',
    description: 'Status badge label for a completed course.',
  },
  statusInProgress: {
    id: 'learner.pathways.courses.statusInProgress',
    defaultMessage: 'In progress',
    description: 'Status badge label for an in-progress course.',
  },
  statusNotStarted: {
    id: 'learner.pathways.courses.statusNotStarted',
    defaultMessage: 'Not started',
    description: 'Status badge label for a not-started course.',
  },
  actionViewCertificate: {
    id: 'learner.pathways.courses.actions.viewCertificate',
    defaultMessage: 'View Certificate',
    description: 'Row action label for a completed course.',
  },
  actionContinue: {
    id: 'learner.pathways.courses.actions.continue',
    defaultMessage: 'Continue',
    description: 'Row action label for an in-progress course.',
  },
  actionRegister: {
    id: 'learner.pathways.courses.actions.register',
    defaultMessage: 'Register',
    description: 'Row action label for a not-started course.',
  },
  rebuildPathway: {
    id: 'learner.pathways.courses.actions.rebuildPathway',
    defaultMessage: 'Rebuild pathway',
    description: 'Leading action to navigate back to the Career Profile page.',
  },
  notAvailable: {
    id: 'learner.pathways.courses.notAvailable',
    defaultMessage: 'Not available',
    description: 'Fallback copy shown when a pathway course field has no value.',
  },
});

export default messages;
