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
  composerLabel: {
    id: 'learner.personalizedSearch.chat.composer.label',
    defaultMessage: 'Message',
    description: 'Accessible label for the Personalized Search message box.',
  },
  composerPlaceholder: {
    id: 'learner.personalizedSearch.chat.composer.placeholder',
    defaultMessage: 'Tell me what you want to learn',
    description: 'Placeholder for the Personalized Search message box.',
  },
  send: {
    id: 'learner.personalizedSearch.chat.send',
    defaultMessage: 'Send',
    description: 'Button that sends a message in Personalized Search.',
  },
  messageTooLong: {
    id: 'learner.personalizedSearch.chat.messageTooLong',
    defaultMessage: 'Messages can be up to 500 characters.',
    description: 'Validation message when a Personalized Search message is too long.',
  },
  newChat: {
    id: 'learner.personalizedSearch.chat.newChat',
    defaultMessage: 'New chat',
    description: 'Button that starts a new Personalized Search chat.',
  },
  you: {
    id: 'learner.personalizedSearch.chat.you',
    defaultMessage: 'You',
    description: 'Screen-reader label for the learner\'s own message.',
  },
  assistant: {
    id: 'learner.personalizedSearch.chat.assistant',
    defaultMessage: 'Assistant',
    description: 'Screen-reader label for an assistant reply.',
  },
  statusUnderstanding: {
    id: 'learner.personalizedSearch.chat.status.understanding',
    defaultMessage: 'Understanding your request…',
    description: 'Status line while the assistant interprets the message.',
  },
  statusSearching: {
    id: 'learner.personalizedSearch.chat.status.searching',
    defaultMessage: 'Searching your catalog…',
    description: 'Status line while the assistant searches the catalog.',
  },
  statusWriting: {
    id: 'learner.personalizedSearch.chat.status.writing',
    defaultMessage: 'Writing your learning page…',
    description: 'Status line while the assistant writes the reply and page.',
  },
  viewPage: {
    id: 'learner.personalizedSearch.chat.viewPage',
    defaultMessage: 'View page',
    description: 'Link on a chat reply that shows that turn\'s learning page.',
  },
  seeLastRecommendations: {
    id: 'learner.personalizedSearch.chat.seeLastRecommendations',
    defaultMessage: 'See your last recommendations',
    description: 'Link on a text-only reply that shows the previous learning page.',
  },
  newReplyAnnouncement: {
    id: 'learner.personalizedSearch.chat.newReplyAnnouncement',
    defaultMessage: 'New reply, {count, plural, one {# pick} other {# picks}} on your learning page',
    description: 'Screen-reader announcement when a Personalized Search reply finishes.',
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
