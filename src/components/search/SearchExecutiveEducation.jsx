import PropTypes from 'prop-types';
import { Configure, Index } from 'react-instantsearch-dom';
import { useIntl } from '@edx/frontend-platform/i18n';

import {
  CONTENT_TYPE_COURSE,
  EXECUTIVE_EDUCATION_TITLE,
  NUM_RESULTS_COURSE,
} from './constants';
import { SEARCH_INDEX_IDS } from '../../constants';
import SearchResults from './SearchResults';
import SearchCourseCard from './SearchCourseCard';

const SearchExecutiveEducation = ({ filter, indexName }) => {
  const intl = useIntl();

  return (
    <Index indexName={indexName} indexId={SEARCH_INDEX_IDS.EXECUTIVE_EDUCATION}>
      <Configure
        hitsPerPage={NUM_RESULTS_COURSE}
        filters={filter}
        clickAnalytics
      />
      <SearchResults
        className="py-5"
        hitComponent={SearchCourseCard}
        title={EXECUTIVE_EDUCATION_TITLE}
        indexName={indexName}
        translatedTitle={intl.formatMessage({
          id: 'enterprise.search.page.executive.education.section.translated.title',
          defaultMessage: 'Executive Education',
          description: 'Translated title for the enterprise search page executive education section.',
        })}
        componentId={SEARCH_INDEX_IDS.EXECUTIVE_EDUCATION}
        contentType={CONTENT_TYPE_COURSE}
      />
    </Index>
  );
};

SearchExecutiveEducation.propTypes = {
  filter: PropTypes.string.isRequired,
  indexName: PropTypes.string.isRequired,
};

export default SearchExecutiveEducation;
