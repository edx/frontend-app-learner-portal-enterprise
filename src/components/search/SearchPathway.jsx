import PropTypes from 'prop-types';
import { Configure, Index } from 'react-instantsearch-dom';
import { useIntl } from '@edx/frontend-platform/i18n';

import { NUM_RESULTS_PATHWAY, PATHWAY_TITLE } from './constants';
import { SEARCH_INDEX_IDS } from '../../constants';
import SearchResults from './SearchResults';
import SearchPathwayCard from '../pathway/SearchPathwayCard';

/**
 * Renders the pathway-specific Algolia search results section.
 *
 * @component
 * @param {{ filter: string, indexName: string }} props
 * @param {string} props.filter - A fully formed Algolia filter string that already includes
 * the `content_type:pathway` clause. This ensures only pathway records are shown in results.
 * @param {string} props.indexName - The Algolia index name to query (resolved by the parent via useAlgoliaSearch).
 *
 * @example
 * <SearchPathway filter="content_type:pathway AND topic:ai" indexName="enterprise_catalog" />
 */
const SearchPathway = ({ filter, indexName }) => {
  const intl = useIntl();
  return (
    <Index indexName={indexName} indexId={SEARCH_INDEX_IDS.PATHWAYS}>
      <Configure
        hitsPerPage={NUM_RESULTS_PATHWAY}
        filters={filter}
        clickAnalytics
      />
      <SearchResults
        hitComponent={SearchPathwayCard}
        title={PATHWAY_TITLE}
        indexName={indexName}
        translatedTitle={
          intl.formatMessage({
            id: 'enterprise.search.page.pathway.section.translated.title',
            defaultMessage: 'Pathways',
            description: 'Translated title for the enterprise search page pathway section.',
          })
        }
        isPathwaySearchResults
        componentId={SEARCH_INDEX_IDS.PATHWAYS}
      />
    </Index>
  );
};

SearchPathway.propTypes = {
  filter: PropTypes.string.isRequired,
  indexName: PropTypes.string.isRequired,
};

export default SearchPathway;
