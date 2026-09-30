import {
  ACADEMY_TITLE,
  CONTENT_TYPE_COURSE,
  CONTENT_TYPE_PATHWAY,
  CONTENT_TYPE_PROGRAM,
  CONTENT_TYPE_VIDEO,
  COURSE_TITLE,
  EXECUTIVE_EDUCATION_TITLE,
  HIGHLIGHTS_TITLE,
  NUM_RESULTS_ACADEMY,
  NUM_RESULTS_COURSE,
  NUM_RESULTS_PATHWAY,
  NUM_RESULTS_PROGRAM,
  NUM_RESULTS_VIDEO,
  PATHWAY_TITLE,
  PROGRAM_TITLE,
  VIDEO_TITLE,
} from '../search/constants';
import SearchCourseCard from '../search/SearchCourseCard';
import SearchProgramCard from '../search/SearchProgramCard';
import SearchPathwayCard from '../pathway/SearchPathwayCard';
import SearchAcademyCard from '../academies/SearchAcademyCard';
import SearchVideoCard from '../search/SearchVideoCard';
import messages from '../search/messages';

export const getContentTypeFromTitle = (title) => {
  switch (title) {
    case PROGRAM_TITLE:
      return CONTENT_TYPE_PROGRAM;
    case COURSE_TITLE:
    case EXECUTIVE_EDUCATION_TITLE:
      return CONTENT_TYPE_COURSE;
    case PATHWAY_TITLE:
      return CONTENT_TYPE_PATHWAY;
    case VIDEO_TITLE:
      return CONTENT_TYPE_VIDEO;
    default:
      return null;
  }
};

export const getHitComponentFromTitle = (title) => {
  switch (title) {
    case COURSE_TITLE:
    case EXECUTIVE_EDUCATION_TITLE:
      return SearchCourseCard;
    case PROGRAM_TITLE:
      return SearchProgramCard;
    case PATHWAY_TITLE:
      return SearchPathwayCard;
    case VIDEO_TITLE:
      return SearchVideoCard;
    default:
      return null;
  }
};

export const getNoOfResultsFromTitle = (title) => {
  switch (title) {
    case COURSE_TITLE:
    case EXECUTIVE_EDUCATION_TITLE:
      return NUM_RESULTS_COURSE;
    case PROGRAM_TITLE:
      return NUM_RESULTS_PROGRAM;
    case PATHWAY_TITLE:
      return NUM_RESULTS_PATHWAY;
    case ACADEMY_TITLE:
      return NUM_RESULTS_ACADEMY;
    case VIDEO_TITLE:
      return NUM_RESULTS_VIDEO;
    default:
      return 0;
  }
};

export const getSkeletonCardFromTitle = (title) => {
  switch (title) {
    case COURSE_TITLE:
    case EXECUTIVE_EDUCATION_TITLE:
      return SearchCourseCard.Skeleton;
    case PROGRAM_TITLE:
      return SearchProgramCard.Skeleton;
    case PATHWAY_TITLE:
      return SearchPathwayCard.Skeleton;
    case ACADEMY_TITLE:
      return SearchAcademyCard.Skeleton;
    case VIDEO_TITLE:
      return SearchVideoCard.Skeleton;
    default:
      return null;
  }
};

// The message set each section title can render. Titles are only listed for the states they
// actually reach: `SearchAcademy` renders `SearchError` but returns `null` instead of an empty
// state, so academies deliberately have no no-results/popular messages. Anything missing (an
// unlisted title, or a state a title never reaches) falls back to the generic `*Default` message,
// which interpolates the content type name.
const SEARCH_MESSAGES_BY_TITLE = {
  [COURSE_TITLE]: {
    noResultsTitle: messages.noResultsTitleCourses,
    noResultsContent: messages.noResultsContentCourses,
    errorTitle: messages.errorTitleCourses,
    popularHeading: messages.popularHeadingCourses,
  },
  [EXECUTIVE_EDUCATION_TITLE]: {
    noResultsTitle: messages.noResultsTitleExecutiveEducation,
    noResultsContent: messages.noResultsContentExecutiveEducation,
    errorTitle: messages.errorTitleExecutiveEducation,
    popularHeading: messages.popularHeadingExecutiveEducation,
  },
  [PROGRAM_TITLE]: {
    noResultsTitle: messages.noResultsTitlePrograms,
    noResultsContent: messages.noResultsContentPrograms,
    errorTitle: messages.errorTitlePrograms,
    popularHeading: messages.popularHeadingPrograms,
  },
  [PATHWAY_TITLE]: {
    noResultsTitle: messages.noResultsTitlePathways,
    noResultsContent: messages.noResultsContentPathways,
    errorTitle: messages.errorTitlePathways,
    popularHeading: messages.popularHeadingPathways,
  },
  [VIDEO_TITLE]: {
    noResultsTitle: messages.noResultsTitleVideos,
    noResultsContent: messages.noResultsContentVideos,
    errorTitle: messages.errorTitleVideos,
    popularHeading: messages.popularHeadingVideos,
  },
  [HIGHLIGHTS_TITLE]: {
    noResultsTitle: messages.noResultsTitleHighlights,
    noResultsContent: messages.noResultsContentHighlights,
    errorTitle: messages.errorTitleHighlights,
    popularHeading: messages.popularHeadingHighlights,
  },
  [ACADEMY_TITLE]: {
    errorTitle: messages.errorTitleAcademies,
  },
};

const DEFAULT_SEARCH_MESSAGES = {
  noResultsTitle: messages.noResultsTitleDefault,
  noResultsContent: messages.noResultsContentDefault,
  errorTitle: messages.errorTitleDefault,
  popularHeading: messages.popularHeadingDefault,
};

const getSearchMessage = (key, title) => (
  SEARCH_MESSAGES_BY_TITLE[title]?.[key] ?? DEFAULT_SEARCH_MESSAGES[key]
);

/**
 * Returns the message descriptors, and the values the fallback descriptors need, for the
 * "no results" alert of a search section. Format them with `intl.formatMessage(descriptor, values)`.
 */
export const getNoResultsMessage = (title) => ({
  messageTitle: getSearchMessage('noResultsTitle', title),
  messageContent: getSearchMessage('noResultsContent', title),
  values: { contentType: title.toLowerCase() },
});

/**
 * Returns the message descriptors, and the values the fallback descriptors need, for the search
 * error alert of a search section. Format them with `intl.formatMessage(descriptor, values)`.
 */
export const getSearchErrorMessage = (title) => ({
  messageTitle: getSearchMessage('errorTitle', title),
  messageContent: messages.errorTryAgainLater,
  values: { contentType: title.toLowerCase() },
});

/**
 * Returns the message descriptor, and the values the fallback descriptor needs, for the
 * "Popular ..." heading of a search section.
 */
export const getPopularResultsHeading = (title) => ({
  message: getSearchMessage('popularHeading', title),
  values: { contentType: title },
});
