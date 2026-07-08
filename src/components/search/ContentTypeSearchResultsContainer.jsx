import { useIntl } from '@edx/frontend-platform/i18n';
import PropTypes from 'prop-types';
import {
  CONTENT_TYPE_COURSE,
  CONTENT_TYPE_PATHWAY,
  CONTENT_TYPE_PROGRAM, CONTENT_TYPE_VIDEO, COURSE_TITLE, EXECUTIVE_EDUCATION_TITLE,
  PATHWAY_TITLE,
  PROGRAM_TITLE,
  VIDEO_TITLE,
} from './constants';
import SearchResults from './SearchResults';
import SearchPathwayCard from '../pathway/SearchPathwayCard';
import SearchProgramCard from './SearchProgramCard';
import SearchCourseCard from './SearchCourseCard';
import SearchVideoCard from './SearchVideoCard';
import {LEARNING_TYPE_EXECUTIVE_EDUCATION} from "@2uinc/frontend-enterprise-catalog-search/data/constants";
import SearchExecutiveEducation from "./SearchExecutiveEducation";

const ContentTypeSearchResultsContainer = ({ contentType, learningType, indexName }) => {
  const intl = useIntl();
  console.log({contentType, learningType});
  // Specified content type is pathways
  if (contentType === CONTENT_TYPE_PATHWAY) {
    return (
      <SearchResults
        className="py-5"
        hitComponent={SearchPathwayCard}
        title={PATHWAY_TITLE}
        translatedTitle={intl.formatMessage({
          id: 'enterprise.search.page.show.more.pathway.section.translated.title',
          defaultMessage: 'Pathways',
          description: 'Translated title for the enterprise search page show all pathways section',
        })}
        contentType={CONTENT_TYPE_PATHWAY}
        indexName={indexName}
      />
    );
  }
  // Specified content type is programs
  if (contentType === CONTENT_TYPE_PROGRAM) {
    return (
      <SearchResults
        className="py-5"
        hitComponent={SearchProgramCard}
        title={PROGRAM_TITLE}
        translatedTitle={intl.formatMessage({
          id: 'enterprise.search.page.show.more.program.section.translated.title',
          defaultMessage: 'Programs',
          description: 'Translated title for the enterprise search page show all programs section.',
        })}
        contentType={CONTENT_TYPE_PROGRAM}
        indexName={indexName}
      />
    );
  }
  // Specified content type is courses
  if (contentType === CONTENT_TYPE_COURSE) {
    return (
      <SearchResults
        className="py-5"
        hitComponent={SearchCourseCard}
        title={COURSE_TITLE}
        translatedTitle={intl.formatMessage({
          id: 'enterprise.search.page.show.more.course.section.translated.title',
          defaultMessage: 'Courses',
          description: 'Translated title for the enterprise search page show all courses section.',
        })}
        contentType={CONTENT_TYPE_COURSE}
        indexName={indexName}
      />
    );
  }
  // Specified content type is video
  if (contentType === CONTENT_TYPE_VIDEO) {
    return (
      <SearchResults
        className="py-5"
        hitComponent={SearchVideoCard}
        title={VIDEO_TITLE}
        translatedTitle={intl.formatMessage({
          id: 'enterprise.search.page.show.more.video.section.translated.title',
          defaultMessage: 'Videos',
          description: 'Translated title for the enterprise search page show all videos section.',
        })}
        contentType={CONTENT_TYPE_VIDEO}
        indexName={indexName}
      />
    );
  }
  // Specified content type is video
  if (!contentType && learningType === LEARNING_TYPE_EXECUTIVE_EDUCATION) {
    return (
      <SearchExecutiveEducation />
    );
  }
  return null;
};

ContentTypeSearchResultsContainer.propTypes = {
  contentType: PropTypes.oneOf(
    [CONTENT_TYPE_PROGRAM, CONTENT_TYPE_PATHWAY, CONTENT_TYPE_COURSE, CONTENT_TYPE_VIDEO],
  ).isRequired,
  indexName: PropTypes.string,
};

ContentTypeSearchResultsContainer.defaultProps = {
  indexName: undefined,
};

export default ContentTypeSearchResultsContainer;
