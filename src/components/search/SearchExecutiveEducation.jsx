import { Configure, Index } from 'react-instantsearch-dom';
import { useIntl } from '@edx/frontend-platform/i18n';

import { LEARNING_TYPE_EXECUTIVE_EDUCATION } from '@2uinc/frontend-enterprise-catalog-search/data/constants';
import {
  CONTENT_TYPE_COURSE,
  EXECUTIVE_EDUCATION_TITLE,
  NUM_RESULTS_COURSE,
} from './constants';
import { SEARCH_INDEX_IDS } from '../../constants';
import SearchResults from './SearchResults';
import SearchCourseCard from './SearchCourseCard';
import { useAlgoliaSearch, useContentTypeFilter, useDefaultSearchFilters } from '../app/data';

const SearchExecutiveEducation = () => {
  const intl = useIntl();
  const { indexName } = useAlgoliaSearch();
  const { filters } = useDefaultSearchFilters();
  const {
    learningTypeFilter,
    contentTypeFilter,
  } = useContentTypeFilter(
    {
      filter: filters,
      contentType: CONTENT_TYPE_COURSE,
      learningType: LEARNING_TYPE_EXECUTIVE_EDUCATION,
    },
  );
  return (
    <Index indexName={indexName} indexId={SEARCH_INDEX_IDS.EXECUTIVE_EDUCATION}>
      <Configure
        hitsPerPage={NUM_RESULTS_COURSE}
        filters={learningTypeFilter}
      />
      <SearchResults
        hitComponent={SearchCourseCard}
        title={EXECUTIVE_EDUCATION_TITLE}
        indexName={indexName}
        translatedTitle={intl.formatMessage({
          id: 'enterprise.search.page.executive.education.section.translated.title',
          defaultMessage: 'Executive Education',
          description: 'Translated title for the enterprise search page executive education section.',
        })}
        componentId={SEARCH_INDEX_IDS.EXECUTIVE_EDUCATION}
        contentType={contentTypeFilter}
      />
    </Index>
  );
};

export default SearchExecutiveEducation;
