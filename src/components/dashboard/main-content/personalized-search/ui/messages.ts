import { defineMessages } from '@edx/frontend-platform/i18n';

const messages = defineMessages({
  greeting: {
    id: 'learner.personalizedSearch.chat.greeting',
    defaultMessage: 'Hi! What do you want to learn?',
    description: 'Opening greeting in the Personalized Search chat pane.',
  },
  greetingDetail: {
    id: 'learner.personalizedSearch.chat.greetingDetail',
    defaultMessage: 'I search your organization\'s catalog and build you a learning page.',
    description: 'Second line of the opening greeting in the Personalized Search chat pane.',
  },
  chipLeadership: {
    id: 'learner.personalizedSearch.chat.chip.leadership',
    defaultMessage: 'Prepare for a leadership role',
    description: 'Opening suggestion chip.',
  },
  chipAi: {
    id: 'learner.personalizedSearch.chat.chip.ai',
    defaultMessage: 'Learn AI for my job',
    description: 'Opening suggestion chip.',
  },
  chipData: {
    id: 'learner.personalizedSearch.chat.chip.data',
    defaultMessage: 'Build data skills',
    description: 'Opening suggestion chip.',
  },
  chipQuick: {
    id: 'learner.personalizedSearch.chat.chip.quick',
    defaultMessage: 'Something quick, under 4 weeks',
    description: 'Opening suggestion chip.',
  },
  chatPaneLabel: {
    id: 'learner.personalizedSearch.chat.label',
    defaultMessage: 'Chat',
    description: 'Accessible label for the Personalized Search chat pane.',
  },
  pagePaneLabel: {
    id: 'learner.personalizedSearch.page.label',
    defaultMessage: 'Your learning page',
    description: 'Accessible label for the Personalized Search learning page pane.',
  },
  emptyPage: {
    id: 'learner.personalizedSearch.page.empty',
    defaultMessage: 'Your learning page is empty. Tell me what you want to learn and I\'ll build it.',
    description: 'Shown in the learning page pane before the first turn.',
  },
  notAvailable: {
    id: 'learner.personalizedSearch.error.notAvailable',
    defaultMessage: 'Personalized Search isn\'t available right now',
    description: 'Shown when the Personalized Search backend is off or the learner lacks access.',
  },
});

export default messages;
