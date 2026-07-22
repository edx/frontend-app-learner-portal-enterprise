import type { PathwayCourse } from '../state';

/**
 * Typed intermediary fixture. Serves two purposes until real course
 * retrieval/recommendation feedback integration lands (ENT-12090): (1) generatePathwayWorkflow's
 * stub result, committed to the store on a successful build (see
 * CareerSelectionContainer.tsx:buildPathway), and (2) getDisplayedPathwayCourses'
 * defensive render-time fallback for the rare case the Pathway page is reached with
 * an empty store. `whyThisFitsYou` stands in for Recommendation Feedback content
 * until that service is actually wired up.
 *
 * Every `status` below is `not_started`: this fixture must never imply real learner
 * progress. `resolvePathwayCourses` ignores this seed value anyway (status is always
 * re-derived from the learner's actual enrollments at render time), but the seed
 * itself should not lie either.
 */
export const PATHWAY_COURSES_STUB: PathwayCourse[] = [
  {
    courseKey: 'corporate-finance',
    title: 'Introduction to Corporate Finance',
    level: 'Introductory',
    length: '2 weeks',
    whyThisFitsYou: 'Understanding corporate finance fundamentals is key for making informed decisions in investment banking.',
    status: 'not_started',
  },
  {
    courseKey: 'financial-analysis-evaluation',
    title: 'Financial Analysis & Evaluation',
    level: 'Intermediate',
    length: '4 weeks',
    whyThisFitsYou: 'This course provides essential skills in financial modeling and evaluation, which are crucial for an investment banking analyst.',
    status: 'not_started',
  },
  {
    courseKey: 'advanced-excel-financial-analysis',
    title: 'Advanced Excel for Financial Analysis',
    level: 'Intermediate',
    length: '8 weeks',
    whyThisFitsYou: 'Excel skills are vital in investment banking for analysis and reporting.',
    status: 'not_started',
  },
  {
    courseKey: 'investment-banking-ma-transactions',
    title: 'Investment Banking: M&A Transactions',
    level: 'Advanced',
    length: '8 weeks',
    whyThisFitsYou: 'This course dives deep into the specifics of M&A transactions, which is a core area of investment banking.',
    status: 'not_started',
  },
  {
    courseKey: 'quantitative-methods-finance',
    title: 'Quantitative Methods in Finance',
    level: 'Advanced',
    length: '12 weeks',
    whyThisFitsYou: 'Given your background, this course will help apply quantitative methods in a financial context.',
    status: 'not_started',
  },
];
