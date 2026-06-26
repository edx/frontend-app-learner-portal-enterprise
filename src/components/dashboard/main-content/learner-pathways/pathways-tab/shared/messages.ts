import { defineMessages } from '@edx/frontend-platform/i18n';

const messages = defineMessages({
  characterLimitExceeded: {
    id: 'learner.pathways.intake.question.character.limit.exceeded',
    defaultMessage: 'Please keep your response up to {max} characters.',
    description: 'Validation message shown when a pathways textarea exceeds the allowed character limit.',
  },
});

export default messages;
