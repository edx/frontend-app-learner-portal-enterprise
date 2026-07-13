import type { PathwayBaselineSnapshot } from '../state';
import type { GoalSummaryFields } from './types';

export type CareerActionState =
  | 'new-pathway'
  | 'existing-pathway-unchanged'
  | 'existing-pathway-edited';

const GOAL_SUMMARY_KEYS: Array<keyof GoalSummaryFields> = [
  'careerGoal',
  'targetIndustry',
  'background',
  'motivation',
];

export interface CareerBaselineComparisonInput {
  goalSummary: GoalSummaryFields;
  selectedCareerId: string | null;
}

/**
 * Whether the learner has made a "relevant edit" (a successfully submitted Goal
 * Summary change, or a different selected career) since the pathway baseline was
 * captured. A null baseline (no pathway generated yet) is never edited.
 */
export const isPathwayEdited = (
  baseline: PathwayBaselineSnapshot | null,
  current: CareerBaselineComparisonInput,
): boolean => {
  if (!baseline) {
    return false;
  }
  if (baseline.selectedCareerId !== current.selectedCareerId) {
    return true;
  }
  return GOAL_SUMMARY_KEYS.some((key) => baseline[key] !== current.goalSummary[key]);
};

export interface GetCareerActionStateParams {
  hasExistingPathway: boolean;
  isEdited: boolean;
}

export const getCareerActionState = ({
  hasExistingPathway,
  isEdited,
}: GetCareerActionStateParams): CareerActionState => {
  if (!hasExistingPathway) {
    return 'new-pathway';
  }
  return isEdited ? 'existing-pathway-edited' : 'existing-pathway-unchanged';
};
