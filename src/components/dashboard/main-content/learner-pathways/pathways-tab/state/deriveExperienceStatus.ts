import type { LearnerIntent } from './learnerIntent';
import type { LearnerProfile, PathwayProgress, PathwaysExperienceStatus } from './types';

const isEmptyIntent = (learnerIntent: LearnerIntent): boolean => (
  !learnerIntent.careerGoal.trim()
  && !learnerIntent.targetIndustry.trim()
  && !learnerIntent.background.trim()
  && !learnerIntent.motivation.trim()
);

export interface DerivePathwaysExperienceStatusInput {
  learnerIntent: LearnerIntent;
  learnerProfile: LearnerProfile | null;
  /**
   * The enrollment-derived progress summary from `pathway-courses/resolvePathwayCourses.ts` —
   * the sole source of truth for whether a pathway exists and how far along it is. Passing
   * `pathwayCourses` directly is deliberately not supported: `progress.totalCourses` already
   * encodes "a pathway exists", and `completed`/`inProgress` already encode real enrollment
   * status, so there is nothing left for this function to re-derive from the raw course list.
   */
  progress: PathwayProgress;
}

/**
 * Derives the learner's experience-level status purely from canonical facts already in the
 * store plus the enrollment-derived pathway progress — never stored/mutated independently, so
 * it can't drift out of sync with the state it summarizes. Sole caller:
 * `courses-tab-alert/data/useLearnerPathwaysAlertViewModel.ts`.
 */
export const derivePathwaysExperienceStatus = (
  { learnerIntent, learnerProfile, progress }: DerivePathwaysExperienceStatusInput,
): PathwaysExperienceStatus => {
  const { completed, inProgress, totalCourses } = progress;
  const hasPathway = totalCourses > 0;

  if (hasPathway && completed === totalCourses) {
    return 'pathway_completed';
  }
  if (completed > 0) {
    return 'pathway_in_progress';
  }
  if (inProgress > 0) {
    return 'course_registered';
  }
  if (hasPathway) {
    return 'pathway_ready';
  }
  if (learnerProfile !== null) {
    return 'profile_ready';
  }
  if (!isEmptyIntent(learnerIntent)) {
    return 'onboarding_in_progress';
  }
  return 'not_started';
};
