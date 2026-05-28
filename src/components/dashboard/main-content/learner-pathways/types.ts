import {
  DASHBOARD_AI_PATHWAYS_TAB,
  DASHBOARD_PATHWAYS_TAB,
} from '../../data/constants';

/**
 * Canonical UI states for the learner pathways alert scaffold.
 *
 * These values intentionally model the PDF-based UX states and can later be
 * mapped from API/BFF domain data without changing the rendering contract.
 */
export type LearnerPathwaysAlertStateKey =
  | 'not_started'
  | 'active_zero_started'
  | 'active_in_progress'
  | 'completed';

/**
 * Supported dashboard tab destinations for alert CTAs.
 */
export type LearnerPathwaysTabTarget =
  | typeof DASHBOARD_AI_PATHWAYS_TAB
  | typeof DASHBOARD_PATHWAYS_TAB
  | null;

/**
 * Action metadata for a single alert CTA button.
 */
export type LearnerPathwaysAction = {
  id: string;
  labelKey: LearnerPathwaysAlertMessageKey;
  variant?: 'primary' | 'outline-primary' | 'tertiary';
};

/**
 * Translation keys used by the learner pathways alert.
 */
export type LearnerPathwaysAlertMessageKey =
  | 'notStartedHeading'
  | 'notStartedBody'
  | 'activeZeroStartedHeading'
  | 'activeZeroStartedBody'
  | 'activeInProgressHeading'
  | 'activeInProgressBody'
  | 'completedHeading'
  | 'completedBody'
  | 'startOnboarding'
  | 'viewPathwayProfile'
  | 'viewPathwayCourses'
  | 'redoOnboardingQuiz'
  | 'startNewPathway';

/**
 * Resolved alert descriptor for a single {@link LearnerPathwaysAlertStateKey}.
 */
export type LearnerPathwaysAlertDescriptor = {
  headingKey: LearnerPathwaysAlertMessageKey;
  bodyKey: LearnerPathwaysAlertMessageKey;
  actions: LearnerPathwaysAction[];
};

/**
 * Progress counters used for dynamic pathway messaging.
 *
 * `startedCount` and `completedCount` are intentionally distinct to support
 * state-specific copy templates.
 */
export type LearnerPathwaysProgressCounts = {
  startedCount: number;
  completedCount: number;
  totalCount: number;
};
