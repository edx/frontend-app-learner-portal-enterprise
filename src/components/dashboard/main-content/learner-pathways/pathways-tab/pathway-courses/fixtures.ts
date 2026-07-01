import type { PathwayCourse } from '../state';

/**
 * Typed intermediary fixture used until the pathway courses workflow/service
 * layer exists. Mirrors the Figma/SVG design reference.
 */
export const PATHWAY_COURSES_STUB: PathwayCourse[] = [
  {
    id: 'corporate-finance',
    title: 'Introduction to Corporate Finance',
    level: 'Introductory',
    length: '2 weeks',
    whyThisFitsYou: 'Understanding corporate finance fundamentals is key for making informed decisions in investment banking.',
    status: 'completed',
  },
  {
    id: 'financial-analysis-evaluation',
    title: 'Financial Analysis & Evaluation',
    level: 'Intermediate',
    length: '4 weeks',
    whyThisFitsYou: 'This course provides essential skills in financial modeling and evaluation, which are crucial for an investment banking analyst.',
    status: 'in_progress',
  },
  {
    id: 'advanced-excel-financial-analysis',
    title: 'Advanced Excel for Financial Analysis',
    level: 'Intermediate',
    length: '8 weeks',
    whyThisFitsYou: 'Excel skills are vital in investment banking for analysis and reporting.',
    status: 'not_started',
  },
  {
    id: 'investment-banking-ma-transactions',
    title: 'Investment Banking: M&A Transactions',
    level: 'Advanced',
    length: '8 weeks',
    whyThisFitsYou: 'This course dives deep into the specifics of M&A transactions, which is a core area of investment banking.',
    status: 'not_started',
  },
  {
    id: 'quantitative-methods-finance',
    title: 'Quantitative Methods in Finance',
    level: 'Advanced',
    length: '12 weeks',
    whyThisFitsYou: 'Given your background, this course will help apply quantitative methods in a financial context.',
    status: 'not_started',
  },
];
