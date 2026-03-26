/**
 * Core types for the AI Pathways service.
 * These types define the data structures used by the service and the UI components.
 */

export type CourseStatus = 'completed' | 'in progress' | 'not started';

export interface CareerOption {
  title: string;
  percentMatch: number;
  skills: string[];
}

export interface LearnerProfile {
  overview: string;
  careerGoal: string;
  targetIndustry: string;
  background: string;
  motivation: string;
  learningStyle: string;
  timeAvailable: string;
  certificate: string;
  careerMatches: CareerOption[];
}

export interface PathwayCourse {
  title: string;
  level: string;
  skills: string[];
  reasoning: string;
  status: CourseStatus;
  order: number;
}

export interface LearningPathway {
  courses: PathwayCourse[];
}

/**
 * Arguments for creating a learner profile.
 */
export interface CreateLearnerProfileArgs {
  bringsYouHereRes: string;
  careerGoalRes: string;
  learningPrefRes: string;
  backgroundRes: string;
  industryRes: string;
  timeAvailableRes: string;
  certificateRes: string;
}

/**
 * Service interface for AI Pathways.
 */
export interface AiPathwaysService {
  createLearnerProfile(args: CreateLearnerProfileArgs): Promise<LearnerProfile>;
  createLearningPathway(careerGoal: CareerOption, learnerProfile: LearnerProfile): Promise<LearningPathway>;
}
