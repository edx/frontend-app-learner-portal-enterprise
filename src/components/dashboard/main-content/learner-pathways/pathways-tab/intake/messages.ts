import { defineMessages } from '@edx/frontend-platform/i18n';

const messages = defineMessages({
  heading: {
    id: 'learner.pathways.intake.heading',
    defaultMessage: 'Get started with your learning journey',
    description: 'Main heading for the learner pathways intake page.',
  },
  beta: {
    id: 'learner.pathways.intake.beta',
    defaultMessage: 'Beta',
    description: 'Beta status label shown next to the intake onboarding heading.',
  },
  introCollapsibleTitle: {
    id: 'learner.pathways.intake.intro.collapsible.title',
    defaultMessage: "Here's how this works",
    description: 'Title for the intake onboarding explanation collapsible.',
  },
  introStepOneTitle: {
    id: 'learner.pathways.intake.intro.step.one.title',
    defaultMessage: 'Answer four questions',
    description: 'First step heading in intake onboarding explanation.',
  },
  introStepOneBody: {
    id: 'learner.pathways.intake.intro.step.one.body',
    defaultMessage: 'Xpert AI builds your learner profile using your responses and real labor market data',
    description: 'First step body in intake onboarding explanation.',
  },
  introStepTwoTitle: {
    id: 'learner.pathways.intake.intro.step.two.title',
    defaultMessage: 'Review profile and select career role',
    description: 'Second step heading in intake onboarding explanation.',
  },
  introStepTwoBody: {
    id: 'learner.pathways.intake.intro.step.two.body',
    defaultMessage: 'Edit your profile and choose a career match',
    description: 'Second step body in intake onboarding explanation.',
  },
  introStepThreeTitle: {
    id: 'learner.pathways.intake.intro.step.three.title',
    defaultMessage: 'Start learning!',
    description: 'Third step heading in intake onboarding explanation.',
  },
  introStepThreeBodyLineOne: {
    id: 'learner.pathways.intake.intro.step.three.body.one',
    defaultMessage: 'Xpert AI builds your personalized course pathway from our catalog of 2,000+ courses.',
    description: 'Third step first body line in intake onboarding explanation.',
  },
  introStepThreeBodyLineTwo: {
    id: 'learner.pathways.intake.intro.step.three.body.two',
    defaultMessage: 'Review courses and register, or adjust your pathway',
    description: 'Third step second body line in intake onboarding explanation.',
  },
  helperText: {
    id: 'learner.pathways.intake.helper.text',
    defaultMessage: 'Your responses help our Xpert AI build an editable learner profile and personalized course pathway.',
    description: 'Helper text below intake onboarding explanation.',
  },
  privacyTriggerLabel: {
    id: 'learner.pathways.intake.privacy.trigger.label',
    defaultMessage: 'View privacy details for intake responses',
    description: 'Accessible label for the intake privacy tooltip trigger.',
  },
  privacyTooltipFirstLine: {
    id: 'learner.pathways.intake.privacy.tooltip.first.line',
    defaultMessage: 'We save only your summarized profile data, never your original text responses.',
    description: 'First privacy line shown in intake privacy tooltip.',
  },
  privacyTooltipSecondLine: {
    id: 'learner.pathways.intake.privacy.tooltip.second.line',
    defaultMessage: "Your pathway course progress may be visible to your organization's administrator.",
    description: 'Second privacy line shown in intake privacy tooltip.',
  },
  goalsSectionTitle: {
    id: 'learner.pathways.intake.section.goals.title',
    defaultMessage: 'Start with your goals',
    description: 'Title for the goals intake question section.',
  },
  motivationQuestionLabel: {
    id: 'learner.pathways.intake.question.motivation.label',
    defaultMessage: 'What\u2019s motivating you to learn right now?',
    description: 'Label for intake motivation question field.',
  },
  motivationQuestionPlaceholder: {
    id: 'learner.pathways.intake.question.motivation.placeholder',
    defaultMessage: 'Example: I am interested in how AI skills can help me advance...',
    description: 'Placeholder text for intake motivation question field.',
  },
  motivationQuestionRequiredError: {
    id: 'learner.pathways.intake.question.motivation.required.error',
    defaultMessage: 'Please enter your motivation.',
    description: 'Validation message shown when motivation question is left empty.',
  },
  goalQuestionLabel: {
    id: 'learner.pathways.intake.question.goal.label',
    defaultMessage: 'What goal would you like to work toward and why?',
    description: 'Label for intake career goal question field.',
  },
  goalQuestionPlaceholder: {
    id: 'learner.pathways.intake.question.goal.placeholder',
    defaultMessage: 'Example: I want to be a better project manager so I can lead larger initiatives...',
    description: 'Placeholder text for intake goal question field.',
  },
  goalQuestionRequiredError: {
    id: 'learner.pathways.intake.question.goal.required.error',
    defaultMessage: 'Please enter a goal.',
    description: 'Validation message shown when goal question is left empty.',
  },
  backgroundSectionTitle: {
    id: 'learner.pathways.intake.section.background.title',
    defaultMessage: 'Tell us about your background',
    description: 'Title for the background intake question section.',
  },
  backgroundQuestionLabel: {
    id: 'learner.pathways.intake.question.background.label',
    defaultMessage: 'What\'s your current role or work area, and what relevant skills or experience do you bring?',
    description: 'Label for intake background question field.',
  },
  backgroundQuestionPlaceholder: {
    id: 'learner.pathways.intake.question.background.placeholder',
    defaultMessage: 'Example: I\u2019ve been in marketing for three years and am strong in content strategy, social media, and comfortable with analytics...',
    description: 'Placeholder text for intake background question field.',
  },
  backgroundQuestionRequiredError: {
    id: 'learner.pathways.intake.question.background.required.error',
    defaultMessage: 'Please enter your current role and skills.',
    description: 'Validation message shown when background question is left empty.',
  },
  industryQuestionLabel: {
    id: 'learner.pathways.intake.question.industry.label',
    defaultMessage: 'Which industries or fields are you interested in?',
    description: 'Label for intake target industry question field.',
  },
  industryQuestionPlaceholder: {
    id: 'learner.pathways.intake.question.industry.placeholder',
    defaultMessage: 'Example: I work in financial services, specifically in compliance and risk management...',
    description: 'Placeholder text for intake industry question field.',
  },
  industryQuestionRequiredError: {
    id: 'learner.pathways.intake.question.industry.required.error',
    defaultMessage: 'Please enter an industry or field.',
    description: 'Validation message shown when industry question is left empty.',
  },
  skipToDashboard: {
    id: 'learner.pathways.intake.actions.skip',
    defaultMessage: 'Skip to dashboard',
    description: 'Secondary action label for skipping intake onboarding.',
  },
  submitAndReviewProfile: {
    id: 'learner.pathways.intake.actions.submit',
    defaultMessage: 'Submit and review profile',
    description: 'Primary action label for submitting intake and moving to profile review.',
  },
  submittingProfile: {
    id: 'learner.pathways.intake.actions.submitting',
    defaultMessage: 'Generating your profile...',
    description: 'Loading label shown on the intake submit action while profile generation is in flight.',
  },
});

export default messages;
