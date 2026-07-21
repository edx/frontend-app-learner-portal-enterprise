import type { LearnerIntent } from './learnerIntent';
import type { LearnerProfile, PathwayCourse, PathwaysExperienceStatus } from './types';

const isEmptyIntent = (learnerIntent: LearnerIntent): boolean => (
  !learnerIntent.careerGoal.trim()
  && !learnerIntent.targetIndustry.trim()
  && !learnerIntent.background.trim()
  && !learnerIntent.motivation.trim()
);

export interface DerivePathwaysExperienceStatusInput {
  learnerIntent: LearnerIntent;
  learnerProfile: LearnerProfile | null;
  pathwayCourses: PathwayCourse[];
}

/**
 * Derives the learner's experience-level status purely from canonical facts already
 * in the store — never stored/mutated independently, so it can't drift out of sync
 * with the state it summarizes.
 *
 * Has no current callers (reserved for a future Courses-tab banner). Note that
 * `pathwayCourses[].status` is a persisted seed that a future caller should not read
 * directly for that banner — prefer feeding it the same enrollment-derived summary
 * `pathway-courses/resolvePathwayCourses.ts` already produces, so enrollment matching
 * isn't re-implemented a second time.
 */
export const derivePathwaysExperienceStatus = (
  { learnerIntent, learnerProfile, pathwayCourses }: DerivePathwaysExperienceStatusInput,
): PathwaysExperienceStatus => {
  if (pathwayCourses.length > 0) {
    if (pathwayCourses.every((course) => course.status === 'completed')) {
      return 'pathway_completed';
    }
    if (pathwayCourses.every((course) => course.status === 'not_started')) {
      return 'pathway_ready';
    }
    return 'pathway_in_progress';
  }
  if (learnerProfile !== null) {
    return 'profile_ready';
  }
  if (!isEmptyIntent(learnerIntent)) {
    return 'onboarding_in_progress';
  }
  return 'not_started';
};
