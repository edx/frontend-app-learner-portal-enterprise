import { defineMessages } from '@edx/frontend-platform/i18n';

// One complete sentence per content type (instead of interpolating a translated/untranslated noun
// into a shared template) so translators can get word order and grammatical gender right. The
// English text matches what the previous string templates produced, except executive education
// ("courses" is added because "executive education" is a mass noun and cannot take "were found").
//
// Only the messages each content type can actually render are defined here, so translators are
// not given dead strings: academies render an error state but never an empty state, so they have
// no no-results/popular messages; highlights have no popular heading because
// `getHitComponentFromTitle` returns null for them, so popular hits are never rendered. See
// SEARCH_MESSAGES_BY_TITLE in ../utils/search for the wiring.
const messages = defineMessages({
  noResultsTitleCourses: {
    id: 'enterprise.search.noResults.title.courses',
    defaultMessage: 'No courses were found to match your search results.',
    description: 'Heading of the alert shown when a search for courses returns no results.',
  },
  noResultsContentCourses: {
    id: 'enterprise.search.noResults.content.courses',
    defaultMessage: 'Check out some popular courses below.',
    description: 'Text of the no-results alert pointing learners to popular courses.',
  },
  errorTitleCourses: {
    id: 'enterprise.search.error.title.courses',
    defaultMessage: 'An error occurred while finding courses that match your search.',
    description: 'Heading of the alert shown when a search for courses fails.',
  },
  popularHeadingCourses: {
    id: 'enterprise.search.popularHeading.courses',
    defaultMessage: 'Popular Courses',
    description: 'Heading above the list of popular courses shown when a search returns no results.',
  },
  noResultsTitleExecutiveEducation: {
    id: 'enterprise.search.noResults.title.executiveEducation',
    defaultMessage: 'No executive education courses were found to match your search results.',
    description: 'Heading of the alert shown when a search for executive education courses returns no results.',
  },
  noResultsContentExecutiveEducation: {
    id: 'enterprise.search.noResults.content.executiveEducation',
    defaultMessage: 'Check out some popular executive education courses below.',
    description: 'Text of the no-results alert pointing learners to popular executive education courses.',
  },
  errorTitleExecutiveEducation: {
    id: 'enterprise.search.error.title.executiveEducation',
    defaultMessage: 'An error occurred while finding executive education courses that match your search.',
    description: 'Heading of the alert shown when a search for executive education courses fails.',
  },
  popularHeadingExecutiveEducation: {
    id: 'enterprise.search.popularHeading.executiveEducation',
    defaultMessage: 'Popular Executive Education',
    description: 'Heading above the list of popular executive education courses shown when a search returns no results.',
  },
  noResultsTitlePrograms: {
    id: 'enterprise.search.noResults.title.programs',
    defaultMessage: 'No programs were found to match your search results.',
    description: 'Heading of the alert shown when a search for programs returns no results.',
  },
  noResultsContentPrograms: {
    id: 'enterprise.search.noResults.content.programs',
    defaultMessage: 'Check out some popular programs below.',
    description: 'Text of the no-results alert pointing learners to popular programs.',
  },
  errorTitlePrograms: {
    id: 'enterprise.search.error.title.programs',
    defaultMessage: 'An error occurred while finding programs that match your search.',
    description: 'Heading of the alert shown when a search for programs fails.',
  },
  popularHeadingPrograms: {
    id: 'enterprise.search.popularHeading.programs',
    defaultMessage: 'Popular Programs',
    description: 'Heading above the list of popular programs shown when a search returns no results.',
  },
  noResultsTitlePathways: {
    id: 'enterprise.search.noResults.title.pathways',
    defaultMessage: 'No pathways were found to match your search results.',
    description: 'Heading of the alert shown when a search for pathways returns no results.',
  },
  noResultsContentPathways: {
    id: 'enterprise.search.noResults.content.pathways',
    defaultMessage: 'Check out some popular pathways below.',
    description: 'Text of the no-results alert pointing learners to popular pathways.',
  },
  errorTitlePathways: {
    id: 'enterprise.search.error.title.pathways',
    defaultMessage: 'An error occurred while finding pathways that match your search.',
    description: 'Heading of the alert shown when a search for pathways fails.',
  },
  popularHeadingPathways: {
    id: 'enterprise.search.popularHeading.pathways',
    defaultMessage: 'Popular Pathways',
    description: 'Heading above the list of popular pathways shown when a search returns no results.',
  },
  noResultsTitleVideos: {
    id: 'enterprise.search.noResults.title.videos',
    defaultMessage: 'No videos were found to match your search results.',
    description: 'Heading of the alert shown when a search for videos returns no results.',
  },
  noResultsContentVideos: {
    id: 'enterprise.search.noResults.content.videos',
    defaultMessage: 'Check out some popular videos below.',
    description: 'Text of the no-results alert pointing learners to popular videos.',
  },
  errorTitleVideos: {
    id: 'enterprise.search.error.title.videos',
    defaultMessage: 'An error occurred while finding videos that match your search.',
    description: 'Heading of the alert shown when a search for videos fails.',
  },
  popularHeadingVideos: {
    id: 'enterprise.search.popularHeading.videos',
    defaultMessage: 'Popular Videos',
    description: 'Heading above the list of popular videos shown when a search returns no results.',
  },
  noResultsTitleHighlights: {
    id: 'enterprise.search.noResults.title.highlights',
    defaultMessage: 'No highlights were found to match your search results.',
    description: 'Heading of the alert shown when a search for highlights returns no results.',
  },
  noResultsContentHighlights: {
    id: 'enterprise.search.noResults.content.highlights',
    defaultMessage: 'Check out some popular highlights below.',
    description: 'Text of the no-results alert pointing learners to popular highlights.',
  },
  errorTitleHighlights: {
    id: 'enterprise.search.error.title.highlights',
    defaultMessage: 'An error occurred while finding highlights that match your search.',
    description: 'Heading of the alert shown when a search for highlights fails.',
  },
  errorTitleAcademies: {
    id: 'enterprise.search.error.title.academies',
    defaultMessage: 'An error occurred while finding academies that match your search.',
    description: 'Heading of the alert shown when a search for academies fails.',
  },
  errorTryAgainLater: {
    id: 'enterprise.search.error.tryAgainLater',
    defaultMessage: 'Please try again later.',
    description: 'Text of the search error alert asking the learner to retry later.',
  },
  noResultsTitleDefault: {
    id: 'enterprise.search.noResults.title.default',
    defaultMessage: 'No {contentType} were found to match your search results.',
    description: 'Fallback heading of the no-results alert for a content type without a dedicated message. {contentType} is the lower-cased content type name.',
  },
  noResultsContentDefault: {
    id: 'enterprise.search.noResults.content.default',
    defaultMessage: 'Check out some popular {contentType} below.',
    description: 'Fallback text of the no-results alert for a content type without a dedicated message. {contentType} is the lower-cased content type name.',
  },
  errorTitleDefault: {
    id: 'enterprise.search.error.title.default',
    defaultMessage: 'An error occurred while finding {contentType} that match your search.',
    description: 'Fallback heading of the search error alert for a content type without a dedicated message. {contentType} is the lower-cased content type name.',
  },
  popularHeadingDefault: {
    id: 'enterprise.search.popularHeading.default',
    defaultMessage: 'Popular {contentType}',
    description: 'Fallback heading above popular results for a content type without a dedicated message. {contentType} is the content type name.',
  },
});

export default messages;
