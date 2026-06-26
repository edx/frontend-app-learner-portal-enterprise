import { defineMessages } from '@edx/frontend-platform/i18n';

const messages = defineMessages({
  goalSummary: {
    id: 'learner.pathways.career.selection.goal.summary',
    defaultMessage: 'Goal Summary',
    description: 'Goal summary card heading.',
  },
  careerGoal: {
    id: 'learner.pathways.career.selection.career.goal',
    defaultMessage: 'Career Goal',
    description: 'Career goal label.',
  },
  targetIndustry: {
    id: 'learner.pathways.career.selection.target.industry',
    defaultMessage: 'Target Industry',
    description: 'Target industry label.',
  },
  background: {
    id: 'learner.pathways.career.selection.background',
    defaultMessage: 'Background',
    description: 'Background label.',
  },
  motivation: {
    id: 'learner.pathways.career.selection.motivation',
    defaultMessage: 'Motivation',
    description: 'Motivation label.',
  },
  careerGoalRequiredError: {
    id: 'learner.pathways.career.selection.career.goal.required.error',
    defaultMessage: 'Please enter a career goal.',
    description: 'Validation message shown when the career goal field is empty.',
  },
  targetIndustryRequiredError: {
    id: 'learner.pathways.career.selection.target.industry.required.error',
    defaultMessage: 'Please enter a target industry.',
    description: 'Validation message shown when the target industry field is empty.',
  },
  backgroundRequiredError: {
    id: 'learner.pathways.career.selection.background.required.error',
    defaultMessage: 'Please enter your background.',
    description: 'Validation message shown when the background field is empty.',
  },
  motivationRequiredError: {
    id: 'learner.pathways.career.selection.motivation.required.error',
    defaultMessage: 'Please enter your motivation.',
    description: 'Validation message shown when the motivation field is empty.',
  },
  edit: {
    id: 'learner.pathways.career.selection.edit',
    defaultMessage: 'Edit',
    description: 'Edit goal summary action.',
  },
  cancel: {
    id: 'learner.pathways.career.selection.cancel',
    defaultMessage: 'Cancel',
    description: 'Cancel goal summary edit action.',
  },
  submit: {
    id: 'learner.pathways.career.selection.submit',
    defaultMessage: 'Submit',
    description: 'Submit goal summary action.',
  },
  submitting: {
    id: 'learner.pathways.career.selection.submitting',
    defaultMessage: 'Submitting...',
    description: 'Goal summary submit loading state.',
  },
  notProvided: {
    id: 'learner.pathways.career.selection.not.provided',
    defaultMessage: 'Not provided',
    description: 'Fallback for empty goal summary fields.',
  },
});

export default messages;
