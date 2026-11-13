import { defineMessages } from '@edx/frontend-platform/i18n';

const messages = defineMessages({
  greeting: {
    id: 'learner.personalizedSearch.chat.greeting',
    defaultMessage: 'Hi! What do you want to learn?',
    description: 'Opening greeting in the Personalized Search chat pane.',
  },
  greetingDetail: {
    id: 'learner.personalizedSearch.chat.greetingDetail',
    defaultMessage: 'I search your organization\'s catalog and show you results to compare.',
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
    defaultMessage: 'Updating your results…',
    description: 'Status line while the assistant writes the reply and page.',
  },
  newReplyAnnouncement: {
    id: 'learner.personalizedSearch.chat.newReplyAnnouncement',
    defaultMessage: 'New reply, {count, plural, one {# pick} other {# picks}} in your results',
    description: 'Screen-reader announcement when a Personalized Search reply finishes.',
  },
  whyThisFits: {
    id: 'learner.personalizedSearch.page.card.whyThisFits',
    defaultMessage: 'Why this fits you',
    description: 'Heading above the AI-written reason a recommended item fits the learner.',
  },
  executiveEducation: {
    id: 'learner.personalizedSearch.page.card.executiveEducation',
    defaultMessage: 'Executive Education',
    description: 'Badge on an Executive Education item card.',
  },
  program: {
    id: 'learner.personalizedSearch.page.card.program',
    defaultMessage: 'Program',
    description: 'Badge on a program item card.',
  },
  weeks: {
    id: 'learner.personalizedSearch.page.card.weeks',
    defaultMessage: '{count, plural, one {# week} other {# weeks}}',
    description: 'Course length fact on an item card.',
  },
  courseCount: {
    id: 'learner.personalizedSearch.page.card.courseCount',
    defaultMessage: '{count, plural, one {# course} other {# courses}}',
    description: 'Number of courses in a program, on an item card.',
  },
  selfPaced: {
    id: 'learner.personalizedSearch.page.card.selfPaced',
    defaultMessage: 'Self-paced',
    description: 'Pacing fact on an item card.',
  },
  instructorPaced: {
    id: 'learner.personalizedSearch.page.card.instructorPaced',
    defaultMessage: 'Instructor-paced',
    description: 'Pacing fact on an item card.',
  },
  partnerLogoAlt: {
    id: 'learner.personalizedSearch.page.card.partnerLogoAlt',
    defaultMessage: '{partner} logo',
    description: 'Alt text for a partner logo on an item card.',
  },
  planTitle: {
    id: 'learner.personalizedSearch.page.plan.title',
    defaultMessage: 'A suggested order',
    description: 'Heading of the suggested learning order in the results.',
  },
  planInfoTitle: {
    id: 'learner.personalizedSearch.page.plan.infoTitle',
    defaultMessage: 'How this order was picked',
    description: 'Info button and popover title explaining the suggested learning order.',
  },
  planInfoBody: {
    id: 'learner.personalizedSearch.page.plan.infoBody',
    defaultMessage: 'These steps come from your results. The best fit for your goal comes first, and each step builds on the one before: foundations before advanced, shorter before longer.',
    description: 'Explains how the steps of the suggested learning order were chosen and ordered.',
  },
  suggestedChip: {
    id: 'learner.personalizedSearch.chat.suggestedChip',
    defaultMessage: 'Suggested',
    description: 'Screen reader label after the text of a chip the AI suggested for this conversation (marked by a sparkle).',
  },
  excludedTab: {
    id: 'learner.personalizedSearch.results.tab.excluded',
    defaultMessage: 'Excluded ({count})',
    description: 'The results tab listing items the learner marked "Not for me", with how many there are.',
  },
  excludedIntro: {
    id: 'learner.personalizedSearch.results.excluded.intro',
    defaultMessage: 'You marked these "Not for me", so they are left out of your results. Include one again to let it back in.',
    description: 'Explains the Excluded tab above the excluded items.',
  },
  includeAgain: {
    id: 'learner.personalizedSearch.results.excluded.includeAgain',
    defaultMessage: 'Include again',
    description: 'Button on an excluded item that lets it back into results.',
  },
  includeAgainItem: {
    id: 'learner.personalizedSearch.results.excluded.includeAgainItem',
    defaultMessage: 'Include again: {title}',
    description: 'Accessible label for the Include again button on an excluded item.',
  },
  forYouTab: {
    id: 'learner.personalizedSearch.results.tab.forYou',
    defaultMessage: 'For you',
    description: 'The results tab with the AI-personalized picks.',
  },
  savedToast: {
    id: 'learner.personalizedSearch.results.savedToast',
    defaultMessage: 'Saved',
    description: 'Toast shown after saving a recommendation.',
  },
  viewSaved: {
    id: 'learner.personalizedSearch.results.viewSaved',
    defaultMessage: 'View saved',
    description: 'Toast action that opens the Saved tab.',
  },
  disclaimer: {
    id: 'learner.personalizedSearch.chat.disclaimer',
    defaultMessage: 'AI recommendations may not be perfect. Results come from your organization\'s catalog.',
    description: 'Note under the Personalized Search message box.',
  },
  stop: {
    id: 'learner.personalizedSearch.chat.stop',
    defaultMessage: 'Stop',
    description: 'Button that stops the reply being written.',
  },
  stopped: {
    id: 'learner.personalizedSearch.chat.stopped',
    defaultMessage: 'Stopped',
    description: 'Label on a reply the learner stopped.',
  },
  retry: {
    id: 'learner.personalizedSearch.chat.retry',
    defaultMessage: 'Retry',
    description: 'Button that sends the same message again after an error.',
  },
  errorTurnInProgress: {
    id: 'learner.personalizedSearch.error.turnInProgress',
    defaultMessage: 'Your previous message is still being answered. Try again in a moment.',
    description: 'Shown when another reply in this chat is still being written.',
  },
  errorThrottled: {
    id: 'learner.personalizedSearch.error.throttled',
    defaultMessage: 'You\'re sending messages quickly. Try again in a minute.',
    description: 'Shown when the learner is rate limited.',
  },
  errorCatalog: {
    id: 'learner.personalizedSearch.error.catalog',
    defaultMessage: 'We couldn\'t search your catalog right now. Try again.',
    description: 'Shown when the catalog search could not start.',
  },
  errorGeneric: {
    id: 'learner.personalizedSearch.error.generic',
    defaultMessage: 'Something went wrong updating your results. Try again.',
    description: 'Shown when a reply fails while it is being written.',
  },
  errorSessionExpired: {
    id: 'learner.personalizedSearch.error.sessionExpired',
    defaultMessage: 'Your session expired. Sign in again.',
    description: 'Shown when the learner\'s sign-in expired while they were chatting (HTTP 401).',
  },
  signIn: {
    id: 'learner.personalizedSearch.error.signIn',
    defaultMessage: 'Sign in',
    description: 'Link to sign in again after the session expired; it returns to this page.',
  },
  chatPaneLabel: {
    id: 'learner.personalizedSearch.chat.label',
    defaultMessage: 'Chat',
    description: 'Accessible label for the Personalized Search chat pane.',
  },
  pagePaneLabel: {
    id: 'learner.personalizedSearch.page.label',
    defaultMessage: 'Your results',
    description: 'Accessible label for the Personalized Search results pane.',
  },
  emptyPage: {
    id: 'learner.personalizedSearch.page.empty',
    defaultMessage: 'Your results will show here. Tell me what you want to learn.',
    description: 'Shown in the results pane before the first turn.',
  },
  paneToggle: {
    id: 'learner.personalizedSearch.paneToggle.label',
    defaultMessage: 'Show the chat or your results',
    description: 'Accessible label for the chat/page toggle shown below 768 px.',
  },
  paneChat: {
    id: 'learner.personalizedSearch.paneToggle.chat',
    defaultMessage: 'Chat',
    description: 'Toggle button that shows the chat pane on small screens.',
  },
  panePage: {
    id: 'learner.personalizedSearch.paneToggle.page',
    defaultMessage: 'Results',
    description: 'Toggle button that shows the results pane on small screens.',
  },
  newPicks: {
    id: 'learner.personalizedSearch.paneToggle.newPicks',
    defaultMessage: 'New picks',
    description: 'Badge on the Page toggle when the results have picks the learner has not seen yet.',
  },
  history: {
    id: 'learner.personalizedSearch.history.button',
    defaultMessage: 'History',
    description: 'Opens the list of the learner\'s past Personalized Search sessions.',
  },
  historyTitle: {
    id: 'learner.personalizedSearch.history.title',
    defaultMessage: 'Past searches',
    description: 'Heading of the history panel.',
  },
  historyEmpty: {
    id: 'learner.personalizedSearch.history.empty',
    defaultMessage: 'No past searches yet.',
    description: 'Shown in the history panel when the learner has no sessions.',
  },
  historyError: {
    id: 'learner.personalizedSearch.history.error',
    defaultMessage: 'We couldn\'t load your past searches. Try again.',
    description: 'Shown when the history list or a past session fails to load.',
  },
  historyLoadMore: {
    id: 'learner.personalizedSearch.history.loadMore',
    defaultMessage: 'Load more',
    description: 'Loads the next page of past sessions.',
  },
  historyPicks: {
    id: 'learner.personalizedSearch.history.picks',
    defaultMessage: '{count, plural, one {# pick} other {# picks}}',
    description: 'How many items a past session recommended.',
  },
  historyToday: {
    id: 'learner.personalizedSearch.history.today',
    defaultMessage: 'Today',
    description: 'History panel divider over the conversations from today.',
  },
  historyYesterday: {
    id: 'learner.personalizedSearch.history.yesterday',
    defaultMessage: 'Yesterday',
    description: 'History panel divider over the conversations from yesterday.',
  },
  historyPreviousWeek: {
    id: 'learner.personalizedSearch.history.previousWeek',
    defaultMessage: 'Previous 7 days',
    description: 'History panel divider over the conversations from the last week.',
  },
  historyOlder: {
    id: 'learner.personalizedSearch.history.older',
    defaultMessage: 'Older',
    description: 'History panel divider over conversations more than a week old.',
  },
  pastSearch: {
    id: 'learner.personalizedSearch.history.pastSearch',
    defaultMessage: 'Past search · {date}. Send a message to continue it.',
    description: 'Banner over a reopened past session.',
  },
  close: {
    id: 'learner.personalizedSearch.close',
    defaultMessage: 'Close',
    description: 'Closes a panel.',
  },
  viewTheseResults: {
    id: 'learner.personalizedSearch.chat.viewTheseResults',
    defaultMessage: 'View these results',
    description: 'Link under an earlier reply that shows the results it produced.',
  },
  showingTheseResults: {
    id: 'learner.personalizedSearch.chat.showingTheseResults',
    defaultMessage: 'Showing these results',
    description: 'Shown under the earlier reply whose results are on screen.',
  },
  earlierResults: {
    id: 'learner.personalizedSearch.page.earlierResults',
    defaultMessage: 'Earlier results for “{message}”',
    description: 'Banner over the results pane while the learner looks at an earlier reply\'s results.',
  },
  backToLatest: {
    id: 'learner.personalizedSearch.page.backToLatest',
    defaultMessage: 'Back to latest results',
    description: 'Returns the results pane to the newest results.',
  },
  loadingResults: {
    id: 'learner.personalizedSearch.page.loadingResults',
    defaultMessage: 'Loading your results',
    description: 'Screen reader text while results stream in behind placeholders.',
  },
  loading: {
    id: 'learner.personalizedSearch.loading',
    defaultMessage: 'Loading',
    description: 'Screen-reader text for a loading spinner.',
  },
  save: {
    id: 'learner.personalizedSearch.feedback.save',
    defaultMessage: 'Save',
    description: 'Saves a recommended item.',
  },
  saved: {
    id: 'learner.personalizedSearch.feedback.saved',
    defaultMessage: 'Saved',
    description: 'Shown on a saved item\'s save toggle, and labels the Saved view button.',
  },
  saveItem: {
    id: 'learner.personalizedSearch.feedback.saveItem',
    defaultMessage: 'Save {title}',
    description: 'Accessible label for saving an item.',
  },
  unsaveItem: {
    id: 'learner.personalizedSearch.feedback.unsaveItem',
    defaultMessage: 'Remove {title} from saved',
    description: 'Accessible label for unsaving an item.',
  },
  course: {
    id: 'learner.personalizedSearch.page.card.course',
    defaultMessage: 'Course',
    description: 'Type label on a course card.',
  },
  hours: {
    id: 'learner.personalizedSearch.page.card.hours',
    defaultMessage: '~{count} hrs/week',
    description: 'Hours per week on a card.',
  },
  hoursRange: {
    id: 'learner.personalizedSearch.page.card.hoursRange',
    defaultMessage: '{min}–{max} hrs/week',
    description: 'A range of hours per week on a card.',
  },
  whyThis: {
    id: 'learner.personalizedSearch.page.card.whyThis',
    defaultMessage: 'Why this?',
    description: 'Opens the short reason a card was recommended.',
  },
  moreActions: {
    id: 'learner.personalizedSearch.page.card.moreActions',
    defaultMessage: 'More options for {title}',
    description: 'Label of the actions menu on a card.',
  },
  notForMe: {
    id: 'learner.personalizedSearch.page.card.notForMe',
    defaultMessage: 'Not for me',
    description: 'Menu action that removes a card from the results.',
  },
  helpful: {
    id: 'learner.personalizedSearch.chat.helpful',
    defaultMessage: 'Helpful',
    description: 'Thumbs up on an assistant reply.',
  },
  notHelpful: {
    id: 'learner.personalizedSearch.chat.notHelpful',
    defaultMessage: 'Not helpful',
    description: 'Thumbs down on an assistant reply.',
  },
  updated: {
    id: 'learner.personalizedSearch.results.updated',
    defaultMessage: 'Updated',
    description: 'Badge on a result that is new since the learner\'s last message.',
  },
  whyThese: {
    id: 'learner.personalizedSearch.results.whyThese',
    defaultMessage: 'Why these?',
    description: 'Opens what the AI knows about the learner and how it picked the results.',
  },
  topPick: {
    id: 'learner.personalizedSearch.results.topPick',
    defaultMessage: 'Top pick',
    description: 'Heading of the item to start with, and a tag on it elsewhere.',
  },
  moreLikeThis: {
    id: 'learner.personalizedSearch.results.moreLikeThis',
    defaultMessage: 'More like this',
    description: 'Asks the assistant for similar items.',
  },
  moreLikeThisMessage: {
    id: 'learner.personalizedSearch.results.moreLikeThisMessage',
    defaultMessage: 'More like {title}',
    description: 'The chat message sent by More like this.',
  },
  compareTopOptions: {
    id: 'learner.personalizedSearch.results.compareTopOptions',
    defaultMessage: 'Compare top options',
    description: 'Eyebrow above the comparison of 2-3 options.',
  },
  bestFor: {
    id: 'learner.personalizedSearch.results.bestFor',
    defaultMessage: 'Best for {bestFor}',
    description: 'What a compared option is best for.',
  },
  notForMeItem: {
    id: 'learner.personalizedSearch.results.notForMeItem',
    defaultMessage: 'Not for me: {title}',
    description: 'Accessible name of the Not for me button on the top pick.',
  },
  moreOptions: {
    id: 'learner.personalizedSearch.results.moreOptions',
    defaultMessage: 'More options',
    description: 'Eyebrow above the results grouped by type.',
  },
  sectionCourse: {
    id: 'learner.personalizedSearch.results.section.course',
    defaultMessage: 'Courses',
    description: 'Heading of the course group.',
  },
  sectionExecutiveEducation: {
    id: 'learner.personalizedSearch.results.section.executiveEducation',
    defaultMessage: 'Executive Education',
    description: 'Heading of the Executive Education group.',
  },
  sectionProgram: {
    id: 'learner.personalizedSearch.results.section.program',
    defaultMessage: 'Programs',
    description: 'Heading of the program group.',
  },
  seeAll: {
    id: 'learner.personalizedSearch.results.seeAll',
    defaultMessage: 'See all ({count})',
    description: 'Link to the full search for a type, with the number of matches.',
  },
  notInterested: {
    id: 'learner.personalizedSearch.feedback.notInterested',
    defaultMessage: 'Not interested',
    description: 'Hides a recommended item and excludes it from later recommendations.',
  },
  notInterestedItem: {
    id: 'learner.personalizedSearch.feedback.notInterestedItem',
    defaultMessage: 'Not interested in {title}',
    description: 'Accessible label for dismissing an item.',
  },
  hiddenItem: {
    id: 'learner.personalizedSearch.feedback.hidden',
    defaultMessage: 'Removed {title}. You won\'t see it in later recommendations.',
    description: 'Notice after Not interested, with an Undo action.',
  },
  undo: {
    id: 'learner.personalizedSearch.feedback.undo',
    defaultMessage: 'Undo',
    description: 'Undoes Not interested.',
  },
  feedbackError: {
    id: 'learner.personalizedSearch.feedback.error',
    defaultMessage: 'We couldn\'t save that change. Try again.',
    description: 'Shown when Save, Not interested or Undo fails; the change is reverted.',
  },
  savedButton: {
    id: 'learner.personalizedSearch.saved.button',
    defaultMessage: 'Saved ({count})',
    description: 'Label of the Saved results tab; count is the number of saved items.',
  },
  savedEmpty: {
    id: 'learner.personalizedSearch.saved.empty',
    defaultMessage: 'Save recommendations to compare them later. Saved items stay here across chats.',
    description: 'Empty Saved view.',
  },
  notAvailable: {
    id: 'learner.personalizedSearch.error.notAvailable',
    defaultMessage: 'Personalized Search isn\'t available right now',
    description: 'Shown when the Personalized Search backend is off or the learner lacks access.',
  },
  debugMenuError: {
    id: 'learner.personalizedSearch.debug.menuError',
    defaultMessage: 'Could not load the model menu.',
    description: 'Debug panel (?debug=true): the model menu request failed.',
  },
  debugCopied: {
    id: 'learner.personalizedSearch.debug.copied',
    defaultMessage: 'Copied {count} benchmark rows.',
    description: 'Debug panel (?debug=true): announced after copying benchmark results.',
  },
  debugCopyFailed: {
    id: 'learner.personalizedSearch.debug.copyFailed',
    defaultMessage: 'Could not copy the benchmark rows.',
    description: 'Debug panel (?debug=true): copying benchmark results failed.',
  },
});

export default messages;
