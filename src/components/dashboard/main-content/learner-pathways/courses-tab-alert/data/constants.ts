import type { PathwaysExperienceStatus } from '../../pathways-tab/state/types';
import type { LearnerPathwaysAlertDescriptor } from '../types';
import messages from '../messages';

/**
 * Descriptor registry for every learner pathways alert state. Keyed by the full
 * `PathwaysExperienceStatus` union so the compiler forces an update here if that union
 * ever grows — mirrors the `STATUS_MESSAGE`/`STATUS_BADGE_VARIANT` pattern already used
 * in `pathway-courses/constants.ts`.
 */
export const LEARNER_PATHWAYS_ALERT_DESCRIPTORS: Record<PathwaysExperienceStatus, LearnerPathwaysAlertDescriptor> = {
  not_started: {
    family: 'purple',
    headingMessage: messages.notStartedHeading,
    bodyMessage: messages.notStartedBody,
    ctaMessage: messages.ctaTakeOnboardingQuiz,
    targetSection: 'onboarding',
    progressVariant: null,
  },
  onboarding_in_progress: {
    family: 'purple',
    headingMessage: messages.onboardingInProgressHeading,
    bodyMessage: messages.onboardingInProgressBody,
    ctaMessage: messages.ctaContinueQuiz,
    targetSection: 'onboarding',
    progressVariant: null,
  },
  profile_ready: {
    family: 'purple',
    headingMessage: messages.profileReadyHeading,
    bodyMessage: messages.profileReadyBody,
    ctaMessage: messages.ctaReviewCareerProfile,
    targetSection: 'profile',
    progressVariant: null,
  },
  pathway_ready: {
    family: 'blue',
    headingMessage: messages.pathwayHeading,
    bodyMessage: messages.pathwayReadyBody,
    ctaMessage: messages.ctaViewLearningPathway,
    targetSection: 'pathway',
    progressVariant: 'ready',
  },
  course_registered: {
    family: 'blue',
    headingMessage: messages.pathwayHeading,
    bodyMessage: messages.courseRegisteredBody,
    ctaMessage: messages.ctaViewLearningPathway,
    targetSection: 'pathway',
    progressVariant: 'in_progress',
  },
  pathway_in_progress: {
    family: 'blue',
    headingMessage: messages.pathwayHeading,
    bodyMessage: messages.pathwayInProgressBody,
    ctaMessage: messages.ctaViewLearningPathway,
    targetSection: 'pathway',
    progressVariant: 'partial',
  },
  pathway_completed: {
    family: 'green',
    headingMessage: messages.pathwayCompletedHeading,
    bodyMessage: messages.pathwayCompletedBody,
    ctaMessage: messages.ctaRetakeOnboardingQuiz,
    // Routes to 'profile', not a new reset flow: the "Retake quiz" button + confirmation
    // modal live in LearnerPathwaysTab (reachable from the Profile page's action row and
    // from the pathway breadcrumb) — this CTA's only job is navigation.
    targetSection: 'profile',
    progressVariant: 'completed',
  },
};
