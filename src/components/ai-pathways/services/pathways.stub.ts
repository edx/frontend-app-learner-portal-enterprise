import type {
  LearnerProfile,
  LearningPathway,
  CareerOption,
  AiPathwaysService,
  CreateLearnerProfileArgs
} from './pathways.types';

export const MOCK_CAREER_OPTIONS: CareerOption[] = [
  {
    title: 'Financial Analyst',
    percentMatch: 0.95,
    skills: ['Financial Modeling', 'Data Analysis', 'Reporting'],
  },
  {
    title: 'Investment Banker',
    percentMatch: 0.88,
    skills: ['M&A Analysis', 'Valuation', 'Financial Modeling'],
  },
  {
    title: 'Risk Manager',
    percentMatch: 0.82,
    skills: ['Risk Assessment', 'Statistical Modeling', 'Regulatory Compliance'],
  },
];

export const MOCK_LEARNER_PROFILE: LearnerProfile = {
  overview: 'Enthusiastic learner looking to transition into a career in finance.',
  careerGoal: 'Financial Analyst',
  targetIndustry: 'Financial Services',
  background: 'Background in business administration and basic data analysis.',
  motivation: 'I want to advance my career and gain specialized skills in finance.',
  learningStyle: 'Asynchronous online learning.',
  timeAvailable: '5-10 hours per week.',
  certificate: 'Interested in earning a professional certificate.',
  careerMatches: MOCK_CAREER_OPTIONS,
};

export const MOCK_PATHWAY: LearningPathway = {
  courses: [
    {
      title: 'Foundations of Finance',
      level: 'Introductory',
      skills: ['Financial Modeling', 'Financial Planning'],
      reasoning: 'Provides the essential background knowledge for your career goal.',
      status: 'completed',
      order: 1,
    },
    {
      title: 'Financial Analysis of Corporations',
      level: 'Intermediate',
      skills: ['Financial Accounting', 'Data Analysis'],
      reasoning: 'Builds upon foundations with specific analysis techniques.',
      status: 'in progress',
      order: 2,
    },
    {
      title: 'Risk Management Tools and Practices',
      level: 'Intermediate',
      skills: ['Risk Management', 'Capital Management'],
      reasoning: 'Develops specialized skills required for advanced financial roles.',
      status: 'not started',
      order: 3,
    },
  ],
};

/**
 * Stub implementation of AiPathwaysService for development and testing.
 */
export const pathwaysStub: AiPathwaysService = {
  createLearnerProfile: async (_args: CreateLearnerProfileArgs): Promise<LearnerProfile> => {
    return new Promise((resolve) => {
      setTimeout(() => resolve(MOCK_LEARNER_PROFILE), 1000);
    });
  },
  createLearningPathway: async (_careerGoal: CareerOption, _learnerProfile: LearnerProfile): Promise<LearningPathway> => {
    return new Promise((resolve) => {
      setTimeout(() => resolve(MOCK_PATHWAY), 1000);
    });
  },
};
