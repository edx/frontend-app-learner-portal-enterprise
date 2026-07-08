import type { LearnerProfile } from '../state';

export type GoalSummaryFields = Pick<LearnerProfile, 'careerGoal' | 'targetIndustry' | 'background' | 'motivation'>;
