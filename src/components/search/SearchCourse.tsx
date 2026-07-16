import { Configure, Index } from 'react-instantsearch-dom';
import { useIntl } from '@edx/frontend-platform/i18n';
import { COURSE_TITLE, NUM_RESULTS_COURSE } from './constants';
import { SEARCH_INDEX_IDS } from '../../constants';
import SearchResults from './SearchResults';
import SearchCourseCard from './SearchCourseCard';

interface SearchCourseHandlers {
  searchResults?: () => void;
  noSearchResults?: () => void;
}

interface SearchCourseProps {
  filter: string;
  indexName: string;
  handlers?: SearchCourseHandlers;
}

/**
 * Renders the course-specific Algolia search results.
 *
 * @param filter - A fully constructed Algolia filter string that already includes the
 * `content_type:course` condition. This filter is applied to restrict results to relevant courses.
 * @param indexName - The Algolia index name to query (resolved by the parent via useAlgoliaSearch).
 * @param handlers - Optional callbacks forwarded to `SearchResults` and invoked when this section
 * has results or no results.
 *
 * @example
 * <SearchCourse
 *   filter="content_type:course AND level:beginner"
 *   indexName="enterprise_catalog"
 *   handlers={{ searchResults: onResults, noSearchResults: onEmpty }}
 * />
 */
const SearchCourse = ({ filter, indexName, handlers }: SearchCourseProps) => {
  const intl = useIntl();
  const translatedTitle = intl.formatMessage({
    id: 'enterprise.search.page.course.section.translated.title',
    defaultMessage: 'Courses',
    description: 'Translated title for the enterprise search page course section.',
  });

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
        handlers={handlers}
        translatedTitle={translatedTitle}
        componentId={SEARCH_INDEX_IDS.COURSE}
      />
    </Index>
  );
};

export default SearchCourse;
