import {
  LearnerProfile as Profile,
  LearningPathway as Pathway,
  PathwayCourse as Course,
  CourseStatus as Status,
  CareerOption as Match,
  CreateLearnerProfileArgs as Args,
} from '../types';

export type CourseStatus = Status;
export type CareerOption = Match;
export type LearnerProfile = Profile;
export type PathwayCourse = Course;
export type LearningPathway = Pathway;
export type CreateLearnerProfileArgs = Args;

/**
 * Service interface for AI Pathways.
 */
export interface AiPathwaysService {
  createLearnerProfile(args: CreateLearnerProfileArgs): Promise<LearnerProfile>;
  createLearningPathway(careerGoal: CareerOption, learnerProfile: LearnerProfile): Promise<LearningPathway>;
}
