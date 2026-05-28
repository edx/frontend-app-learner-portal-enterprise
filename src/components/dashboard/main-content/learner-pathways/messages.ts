import { defineMessages } from '@edx/frontend-platform/i18n';

/**
 * Internationalized copy for the learner pathways alert scaffold.
 *
 * Progress-oriented messages intentionally support dynamic interpolation
 * (`startedCount`, `completedCount`, `totalCount`) so a single component
 * can render all pathway progress states.
 */
const learnerPathwaysMessages = defineMessages({
  notStartedHeading: {
    id: 'enterprise.dashboard.learner.pathways.alert.not.started.heading',
    defaultMessage: 'Ready to start your learning journey?',
    description: 'Heading for learner pathways alert when no pathway has started yet.',
  },
  notStartedBody: {
    id: 'enterprise.dashboard.learner.pathways.alert.not.started.body',
    defaultMessage: 'Take a five minute quiz to build your pathway.',
    description: 'Body text for learner pathways alert when no pathway has started yet.',
  },
  activeZeroStartedHeading: {
    id: 'enterprise.dashboard.learner.pathways.alert.active.zero.started.heading',
    defaultMessage: 'Your learning pathway progress: {startedCount}/{totalCount} courses started',
    description: 'Heading for learner pathways alert when pathway exists but no courses have started.',
  },
  activeZeroStartedBody: {
    id: 'enterprise.dashboard.learner.pathways.alert.active.zero.started.body',
    defaultMessage: 'Your pathway has been generated. Review your profile and course list to get started.',
    description: 'Body text for learner pathways alert when pathway exists but no courses have started.',
  },
  activeInProgressHeading: {
    id: 'enterprise.dashboard.learner.pathways.alert.active.in.progress.heading',
    defaultMessage: 'Your learning pathway',
    description: 'Heading for learner pathways alert when a pathway is currently in progress.',
  },
  activeInProgressBody: {
    id: 'enterprise.dashboard.learner.pathways.alert.active.in.progress.body',
    defaultMessage: 'Progress: {startedCount}/{totalCount} courses started',
    description: 'Body text for learner pathways alert when a pathway is currently in progress.',
  },
  completedHeading: {
    id: 'enterprise.dashboard.learner.pathways.alert.completed.heading',
    defaultMessage: 'Your learning pathway is complete!',
    description: 'Heading for learner pathways alert when pathway is completed.',
  },
  completedBody: {
    id: 'enterprise.dashboard.learner.pathways.alert.completed.body',
    defaultMessage: 'Progress: {completedCount}/{totalCount} courses completed',
    description: 'Body text for learner pathways alert when pathway is completed.',
  },
  startOnboarding: {
    id: 'enterprise.dashboard.learner.pathways.alert.action.start.onboarding',
    defaultMessage: 'Start pathway onboarding',
    description: 'Button label to start learner pathways onboarding.',
  },
  viewPathwayProfile: {
    id: 'enterprise.dashboard.learner.pathways.alert.action.view.profile',
    defaultMessage: 'View pathway profile',
    description: 'Button label to view learner pathway profile.',
  },
  viewPathwayCourses: {
    id: 'enterprise.dashboard.learner.pathways.alert.action.view.courses',
    defaultMessage: 'View pathway courses',
    description: 'Button label to view learner pathway courses.',
  },
  redoOnboardingQuiz: {
    id: 'enterprise.dashboard.learner.pathways.alert.action.redo.quiz',
    defaultMessage: 'Redo onboarding quiz',
    description: 'Button label to redo learner pathway onboarding quiz.',
  },
  startNewPathway: {
    id: 'enterprise.dashboard.learner.pathways.alert.action.start.new.pathway',
    defaultMessage: 'Start a new pathway',
    description: 'Button label to start a new learner pathway.',
  },
  viewCertificate: {
    id: 'enterprise.dashboard.learner.pathways.alert.action.view.certificate',
    defaultMessage: 'View certificate',
    description: 'Button label to view a pathway completion certificate.',
  },
});

export default learnerPathwaysMessages;
