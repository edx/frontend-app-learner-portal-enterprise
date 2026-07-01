import PropTypes from 'prop-types';
import { Configure, Index } from 'react-instantsearch-dom';
import PopularResults from './PopularResults';
import { NUM_RESULTS_TO_DISPLAY } from './data/constants';
import { getContentTypeFromTitle } from '../../utils/search';
import {
  useAlgoliaSearch, useContentTypeFilter, useDefaultSearchFilters,
} from '../../app/data';

const PopularResultsIndex = ({ title, numberResultsToDisplay }) => {
  const filters = useDefaultSearchFilters();
  const { searchIndex } = useAlgoliaSearch();
  const contentType = getContentTypeFromTitle(title);
  const {
    contentTypeFilter: defaultFilter,
  } = useContentTypeFilter({ filter: filters, contentType });
  const searchConfig = {
    query: '',
    hitsPerPage: numberResultsToDisplay,
    filters: defaultFilter,
  };
  return (
    <Index indexName={searchIndex?.indexName} indexId={`popular-${title}`}>
      <Configure {...searchConfig} />
      <PopularResults title={title} numberResultsToDisplay={numberResultsToDisplay} />
    </Index>
  );
};

PopularResultsIndex.propTypes = {
  title: PropTypes.string.isRequired,
  numberResultsToDisplay: PropTypes.number,
};

PopularResultsIndex.defaultProps = {
  numberResultsToDisplay: NUM_RESULTS_TO_DISPLAY,
};

export default PopularResultsIndex;
