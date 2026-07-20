import { defineMessages } from '@edx/frontend-platform/i18n';

const messages = defineMessages({
  characterLimitExceeded: {
    id: 'learner.pathways.intake.question.character.limit.exceeded',
    defaultMessage: 'Please keep your response up to {max} characters.',
    description: 'Validation message shown when a pathways textarea exceeds the allowed character limit.',
  },
  giveFeedback: {
    id: 'learner.pathways.actions.giveFeedback',
    defaultMessage: 'Give feedback',
    description: 'Action-bar link (present on every Learner Pathways page) and feedback-modal primary action, both opening the pathways feedback form.',
  },
});

export default messages;
