import { defineMessages } from '@edx/frontend-platform/i18n';

// One complete sentence per content type (instead of interpolating a translated/untranslated noun
// into a shared template) so translators can get word order and grammatical gender right. The
// English text matches what the previous string templates produced, except executive education
// ("courses" is added because "executive education" is a mass noun and cannot take "were found").
//
// Only the messages each content type can actually render are defined here: academies render an
// error state but never an empty state, so they have no no-results/popular messages. See
// SEARCH_MESSAGES_BY_TITLE in ../utils/search for the wiring.
const messages = defineMessages({
  noResultsTitleCourses: {
    id: 'enterprise.search.no.results.title.courses',
    defaultMessage: 'No courses were found to match your search results.',
    description: 'Heading of the alert shown when a search for courses returns no results.',
  },
  noResultsContentCourses: {
    id: 'enterprise.search.no.results.content.courses',
    defaultMessage: 'Check out some popular courses below.',
    description: 'Text of the no-results alert pointing learners to popular courses.',
  },
  errorTitleCourses: {
    id: 'enterprise.search.error.title.courses',
    defaultMessage: 'An error occurred while finding courses that match your search.',
    description: 'Heading of the alert shown when a search for courses fails.',
  },
  popularHeadingCourses: {
    id: 'enterprise.search.popular.heading.courses',
    defaultMessage: 'Popular Courses',
    description: 'Heading above the list of popular courses shown when a search returns no results.',
  },
  noResultsTitleExecutiveEducation: {
    id: 'enterprise.search.no.results.title.executiveEducation',
    defaultMessage: 'No executive education courses were found to match your search results.',
    description: 'Heading of the alert shown when a search for executive education courses returns no results.',
  },
  noResultsContentExecutiveEducation: {
    id: 'enterprise.search.no.results.content.executiveEducation',
    defaultMessage: 'Check out some popular executive education courses below.',
    description: 'Text of the no-results alert pointing learners to popular executive education courses.',
  },
  errorTitleExecutiveEducation: {
    id: 'enterprise.search.error.title.executiveEducation',
    defaultMessage: 'An error occurred while finding executive education courses that match your search.',
    description: 'Heading of the alert shown when a search for executive education courses fails.',
  },
  popularHeadingExecutiveEducation: {
    id: 'enterprise.search.popular.heading.executiveEducation',
    defaultMessage: 'Popular Executive Education',
    description: 'Heading above the list of popular executive education courses shown when a search returns no results.',
  },
  noResultsTitlePrograms: {
    id: 'enterprise.search.no.results.title.programs',
    defaultMessage: 'No programs were found to match your search results.',
    description: 'Heading of the alert shown when a search for programs returns no results.',
  },
  noResultsContentPrograms: {
    id: 'enterprise.search.no.results.content.programs',
    defaultMessage: 'Check out some popular programs below.',
    description: 'Text of the no-results alert pointing learners to popular programs.',
  },
  errorTitlePrograms: {
    id: 'enterprise.search.error.title.programs',
    defaultMessage: 'An error occurred while finding programs that match your search.',
    description: 'Heading of the alert shown when a search for programs fails.',
  },
  popularHeadingPrograms: {
    id: 'enterprise.search.popular.heading.programs',
    defaultMessage: 'Popular Programs',
    description: 'Heading above the list of popular programs shown when a search returns no results.',
  },
  noResultsTitlePathways: {
    id: 'enterprise.search.no.results.title.pathways',
    defaultMessage: 'No pathways were found to match your search results.',
    description: 'Heading of the alert shown when a search for pathways returns no results.',
  },
  noResultsContentPathways: {
    id: 'enterprise.search.no.results.content.pathways',
    defaultMessage: 'Check out some popular pathways below.',
    description: 'Text of the no-results alert pointing learners to popular pathways.',
  },
  errorTitlePathways: {
    id: 'enterprise.search.error.title.pathways',
    defaultMessage: 'An error occurred while finding pathways that match your search.',
    description: 'Heading of the alert shown when a search for pathways fails.',
  },
  popularHeadingPathways: {
    id: 'enterprise.search.popular.heading.pathways',
    defaultMessage: 'Popular Pathways',
    description: 'Heading above the list of popular pathways shown when a search returns no results.',
  },
  noResultsTitleVideos: {
    id: 'enterprise.search.no.results.title.videos',
    defaultMessage: 'No videos were found to match your search results.',
    description: 'Heading of the alert shown when a search for videos returns no results.',
  },
  noResultsContentVideos: {
    id: 'enterprise.search.no.results.content.videos',
    defaultMessage: 'Check out some popular videos below.',
    description: 'Text of the no-results alert pointing learners to popular videos.',
  },
  errorTitleVideos: {
    id: 'enterprise.search.error.title.videos',
    defaultMessage: 'An error occurred while finding videos that match your search.',
    description: 'Heading of the alert shown when a search for videos fails.',
  },
  popularHeadingVideos: {
    id: 'enterprise.search.popular.heading.videos',
    defaultMessage: 'Popular Videos',
    description: 'Heading above the list of popular videos shown when a search returns no results.',
  },
  noResultsTitleHighlights: {
    id: 'enterprise.search.no.results.title.highlights',
    defaultMessage: 'No highlights were found to match your search results.',
    description: 'Heading of the alert shown when a search for highlights returns no results.',
  },
  noResultsContentHighlights: {
    id: 'enterprise.search.no.results.content.highlights',
    defaultMessage: 'Check out some popular highlights below.',
    description: 'Text of the no-results alert pointing learners to popular highlights.',
  },
  errorTitleHighlights: {
    id: 'enterprise.search.error.title.highlights',
    defaultMessage: 'An error occurred while finding highlights that match your search.',
    description: 'Heading of the alert shown when a search for highlights fails.',
  },
  popularHeadingHighlights: {
    id: 'enterprise.search.popular.heading.highlights',
    defaultMessage: 'Popular highlights',
    description: 'Heading above the list of popular highlights shown when a search returns no results.',
  },
  errorTitleAcademies: {
    id: 'enterprise.search.error.title.academies',
    defaultMessage: 'An error occurred while finding academies that match your search.',
    description: 'Heading of the alert shown when a search for academies fails.',
  },
  errorTryAgainLater: {
    id: 'enterprise.search.error.try.again.later',
    defaultMessage: 'Please try again later.',
    description: 'Text of the search error alert asking the learner to retry later.',
  },
  noResultsTitleDefault: {
    id: 'enterprise.search.no.results.title.default',
    defaultMessage: 'No {contentType} were found to match your search results.',
    description: 'Fallback heading of the no-results alert for a content type without a dedicated message. {contentType} is the lower-cased content type name.',
  },
  noResultsContentDefault: {
    id: 'enterprise.search.no.results.content.default',
    defaultMessage: 'Check out some popular {contentType} below.',
    description: 'Fallback text of the no-results alert for a content type without a dedicated message. {contentType} is the lower-cased content type name.',
  },
  errorTitleDefault: {
    id: 'enterprise.search.error.title.default',
    defaultMessage: 'An error occurred while finding {contentType} that match your search.',
    description: 'Fallback heading of the search error alert for a content type without a dedicated message. {contentType} is the lower-cased content type name.',
  },
  popularHeadingDefault: {
    id: 'enterprise.search.popular.heading.default',
    defaultMessage: 'Popular {contentType}',
    description: 'Fallback heading above popular results for a content type without a dedicated message. {contentType} is the content type name.',
  },
});

export default messages;
