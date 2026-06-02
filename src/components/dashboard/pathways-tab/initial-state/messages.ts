import { defineMessages } from '@edx/frontend-platform/i18n';

/**
 * i18n descriptors for the Learner Pathways tab initial-state scaffold.
 */
const messages = defineMessages({
  heroTitle: {
    id: 'enterprise.dashboard.pathways.learnerPathways.heroTitle',
    defaultMessage: 'Build your personalized pathway!',
    description: 'Learner pathways tab scaffold hero heading.',
  },
  heroBody: {
    id: 'enterprise.dashboard.pathways.learnerPathways.heroBody',
    defaultMessage: 'A personalized pathway helps you achieve your goals. Answer a few questions to tell us more about the skills and jobs you are interested in, and our XPERT AI will build your personalized course pathways, a set of courses recommended and ordered based on the skills you have and the ones you need to level up to achieve your learning goals.',
    description: 'Learner pathways tab scaffold hero description.',
  },
  stageOnboarding: {
    id: 'enterprise.dashboard.pathways.learnerPathways.stage.onboarding',
    defaultMessage: '1. Onboarding Quiz',
    description: 'Learner pathways scaffold stage label.',
  },
  stageProfile: {
    id: 'enterprise.dashboard.pathways.learnerPathways.stage.profile',
    defaultMessage: '2. Review your profile',
    description: 'Learner pathways scaffold stage label.',
  },
  stagePathway: {
    id: 'enterprise.dashboard.pathways.learnerPathways.stage.pathway',
    defaultMessage: '3. Start your pathway',
    description: 'Learner pathways scaffold stage label.',
  },
  startOnboarding: {
    id: 'enterprise.dashboard.pathways.learnerPathways.action.startOnboarding',
    defaultMessage: 'Start Pathway Onboarding',
    description: 'Learner pathways scaffold action to start onboarding.',
  },
});

export default messages;
