import type { CareerMatch, LearnerProfile, OnboardingAnswers } from '../state';

export const CAREER_SELECTION_STUB_PROFILE: LearnerProfile = {
  summary:
    'Senior data professional preparing for a career advancement opportunity.',
  careerGoal: 'Senior Data Analyst',
  targetIndustry: 'EdTech',
  background:
    'Data analyst at 2U with extensive experience in financial data and team leadership.',
  motivation: 'Upskill to prepare for promotion',
  learningStyle: 'Hands-on',
  weeklyTimeCommitment: '5 hours per week',
  certificatePreference: 'Preferred',
  skills: [
    'Data Analysis',
    'Data Cleansing',
    'Data Governance',
    'Metadata',
    'SQL',
  ],
};

export const CAREER_SELECTION_STUB_MATCHES: CareerMatch[] = [
  {
    id: 'reporting-data-analysis-manager',
    title: 'Reporting and Data Analysis Manager',
    matchPercentage: 95,
    laborMarketTrend: 'High demand',
    skillsToDevelop: [
      'Data Analysis',
      'Data Cleansing',
      'Data Governance',
      'Metadata',
      'Distributed File Systems',
      'Tableau',
      'SQL',
      'Power BI',
      'Data Visualization',
      'Dashboard Design',
      'Business Intelligence',
      'Project Performance',
      'Graphing',
      'Business Intelligence Tools',
      'Data Quality',
    ],
  },
  {
    id: 'business-data-analyst',
    title: 'Business Data Analyst',
    matchPercentage: 95,
    skillsToDevelop: [
      'Data Analysis',
      'SQL',
      'Dashboard Design',
      'Business Intelligence',
      'Data Visualization',
    ],
  },
  {
    id: 'data-analyst',
    title: 'Data Analyst',
    matchPercentage: 90,
    skillsToDevelop: [
      'Data Analysis',
      'SQL',
      'Data Cleansing',
      'Data Visualization',
      'Statistics',
    ],
  },
  {
    id: 'human-resources-data-analyst',
    title: 'Human Resources Data Analyst',
    matchPercentage: 75,
    skillsToDevelop: [
      'People Analytics',
      'Data Analysis',
      'Dashboard Design',
      'Data Governance',
    ],
  },
  {
    id: 'hiring-manager',
    title: 'Hiring Manager',
    matchPercentage: 40,
    skillsToDevelop: [
      'Interviewing',
      'Talent Strategy',
      'Stakeholder Management',
    ],
  },
  {
    id: 'assistant-shift-manager',
    title: 'Assistant Shift Manager',
    matchPercentage: 26,
    skillsToDevelop: [
      'Team Leadership',
      'Operations Management',
      'Performance Management',
    ],
  },
  {
    id: 'inventory-clerk',
    title: 'Inventory Clerk',
    matchPercentage: 20,
    skillsToDevelop: ['Inventory Management'],
  },
];

export const buildCareerSelectionStubProfile = (
  answers: Partial<OnboardingAnswers>,
): LearnerProfile => ({
  ...CAREER_SELECTION_STUB_PROFILE,
  careerGoal: answers.goal?.trim() || CAREER_SELECTION_STUB_PROFILE.careerGoal,
  targetIndustry:
    answers.industry?.trim() || CAREER_SELECTION_STUB_PROFILE.targetIndustry,
  background:
    answers.background?.trim() || CAREER_SELECTION_STUB_PROFILE.background,
  motivation:
    answers.motivation?.trim() || CAREER_SELECTION_STUB_PROFILE.motivation,
});
