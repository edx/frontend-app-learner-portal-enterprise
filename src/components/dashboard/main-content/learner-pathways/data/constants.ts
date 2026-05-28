import {
  LearnerPathwaysAlertDescriptor,
  LearnerPathwaysAlertStateKey,
} from '../types';

/**
 * Default render state for the PDF-driven learner pathways alert scaffold.
 */
export const DEFAULT_LEARNER_PATHWAYS_ALERT_STATE: LearnerPathwaysAlertStateKey = 'not_started';

/**
 * Lookup map of display descriptors keyed by
 * {@link LearnerPathwaysAlertStateKey}.
 */
type LearnerPathwaysAlertDescriptorMap = Record<
LearnerPathwaysAlertStateKey,
LearnerPathwaysAlertDescriptor
>;

/**
 * Descriptor registry for all learner pathways alert states.
 *
 * All user-facing strings are represented as translation keys and resolved
 * in the render layer via `FormattedMessage`.
 */
export const LEARNER_PATHWAYS_ALERT_DESCRIPTORS: LearnerPathwaysAlertDescriptorMap = {
  not_started: {
    headingKey: 'notStartedHeading',
    bodyKey: 'notStartedBody',
    actions: [
      {
        id: 'start-onboarding',
        labelKey: 'startOnboarding',
        variant: 'primary',
      },
    ],
  },
  active_zero_started: {
    headingKey: 'activeZeroStartedHeading',
    bodyKey: 'activeZeroStartedBody',
    actions: [
      { id: 'view-pathway-profile', labelKey: 'viewPathwayProfile', variant: 'outline-primary' },
      { id: 'view-pathway-courses', labelKey: 'viewPathwayCourses', variant: 'outline-primary' },
      { id: 'redo-onboarding', labelKey: 'redoOnboardingQuiz', variant: 'tertiary' },
    ],
  },
  active_in_progress: {
    headingKey: 'activeInProgressHeading',
    bodyKey: 'activeInProgressBody',
    actions: [
      { id: 'view-pathway-profile', labelKey: 'viewPathwayProfile', variant: 'outline-primary' },
      { id: 'view-pathway-courses', labelKey: 'viewPathwayCourses', variant: 'outline-primary' },
      { id: 'redo-onboarding', labelKey: 'redoOnboardingQuiz', variant: 'tertiary' },
    ],
  },
  completed: {
    headingKey: 'completedHeading',
    bodyKey: 'completedBody',
    actions: [
      { id: 'start-new-pathway', labelKey: 'startNewPathway', variant: 'primary' },
      { id: 'view-pathway-profile', labelKey: 'viewPathwayProfile', variant: 'outline-primary' },
      { id: 'view-certificate', labelKey: 'viewCertificate', variant: 'tertiary' },
    ],
  },
};
