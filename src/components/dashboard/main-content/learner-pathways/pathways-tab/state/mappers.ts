import type { LearnerProfile, OnboardingAnswers } from './types';

/**
 * Maps the Goal Summary's editable LearnerProfile fields back onto their
 * corresponding Intake/OnboardingAnswers fields, so a successful Goal Summary edit
 * keeps the persisted Intake answers in sync with what actually generated the
 * current profile. Field names differ: careerGoal -> goal, targetIndustry -> industry;
 * background/motivation are shared verbatim.
 */
export const mapProfileToOnboardingAnswers = (
  profile: Pick<LearnerProfile, 'careerGoal' | 'targetIndustry' | 'background' | 'motivation'>,
): OnboardingAnswers => ({
  goal: profile.careerGoal,
  industry: profile.targetIndustry,
  background: profile.background,
  motivation: profile.motivation,
});
