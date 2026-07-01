import PropTypes from 'prop-types';
import { Configure, Index } from 'react-instantsearch-dom';
import { useIntl } from '@edx/frontend-platform/i18n';

import { NUM_RESULTS_PROGRAM, PROGRAM_TITLE } from './constants';
import { SEARCH_INDEX_IDS } from '../../constants';
import SearchResults from './SearchResults';
import SearchProgramCard from './SearchProgramCard';

/**
 * Renders the program-specific Algolia search results.
 *
 * @param {{ filter: string, indexName: string }} props
 * @param {string} props.filter - A preconstructed Algolia filter string that includes the
 * `content_type:program` clause. This filter ensures only program results are returned.
 * @param {string} props.indexName - The Algolia index name to query (resolved by the parent via useAlgoliaSearch).
 *
 * @example
 * <SearchProgram filter="content_type:program AND level:advanced" indexName="enterprise_catalog" />
 */
const SearchProgram = ({ filter, indexName }) => {
  const intl = useIntl();
  return (
    <Index indexName={indexName} indexId={SEARCH_INDEX_IDS.PROGRAMS}>
      <Configure
        hitsPerPage={NUM_RESULTS_PROGRAM}
        filters={filter}
        clickAnalytics
      />
      <SearchResults
        hitComponent={SearchProgramCard}
        title={PROGRAM_TITLE}
        translatedTitle={
          intl.formatMessage({
            id: 'enterprise.search.page.program.section.translated.title',
            defaultMessage: 'Programs',
            description: 'Translated title for the enterprise search page program section.',
          })
        }
        componentId={SEARCH_INDEX_IDS.PROGRAMS}
      />
    </Index>
  );
};

SearchProgram.propTypes = {
  filter: PropTypes.string.isRequired,
  indexName: PropTypes.string.isRequired,
};

export default SearchProgram;
