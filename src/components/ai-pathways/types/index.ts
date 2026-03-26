/**
 * Feature-local types for the AI Pathways prototype.
 */

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

export interface CareerOption {
  title: string;
  percentMatch: number;
  skills: string[];
}

export type CourseStatus = 'completed' | 'in progress' | 'not started';

export interface LearningPathway {
  courses: {
    title: string;
    level: string;
    skills: string[];
    reasoning: string;
    status: CourseStatus;
    order: number;
  }[];
}
