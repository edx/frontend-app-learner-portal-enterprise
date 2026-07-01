import PropTypes from 'prop-types';
import { Configure, Index } from 'react-instantsearch-dom';
import { useIntl } from '@edx/frontend-platform/i18n';
import { COURSE_TITLE, NUM_RESULTS_COURSE } from './constants';
import { SEARCH_INDEX_IDS } from '../../constants';
import SearchResults from './SearchResults';
import SearchCourseCard from './SearchCourseCard';

/**
 * Renders the course-specific Algolia search results.
 *
 * @param {{ filter: string, indexName: string }} props
 * @param {string} props.filter - A fully constructed Algolia filter string that already includes the
 * `content_type:course` condition. This filter is applied to restrict results to relevant courses.
 * @param {string} props.indexName - The Algolia index name to query (resolved by the parent via useAlgoliaSearch).
 *
 * @example
 * <SearchCourse filter="content_type:course AND level:beginner" indexName="enterprise_catalog" />
 */
const SearchCourse = ({ filter, indexName }) => {
  const intl = useIntl();
  return (
    <Index indexName={indexName} indexId={SEARCH_INDEX_IDS.COURSE}>
      <Configure
        hitsPerPage={NUM_RESULTS_COURSE}
        filters={filter}
        clickAnalytics
      />
      <SearchResults
        hitComponent={SearchCourseCard}
        title={COURSE_TITLE}
        indexName={indexName}
        translatedTitle={
          intl.formatMessage({
            id: 'enterprise.search.page.course.section.translated.title',
            defaultMessage: 'Courses',
            description: 'Translated title for the enterprise search page course section.',
          })
        }
        componentId={SEARCH_INDEX_IDS.COURSE}
      />
    </Index>
  );
};

SearchCourse.propTypes = {
  filter: PropTypes.string.isRequired,
  indexName: PropTypes.string.isRequired,
};

export default SearchCourse;
