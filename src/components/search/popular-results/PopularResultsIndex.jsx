import PropTypes from 'prop-types';
import { Configure, Index } from 'react-instantsearch-dom';
import PopularResults from './PopularResults';
import { NUM_RESULTS_TO_DISPLAY } from './data/constants';
import { getContentTypeFromTitle } from '../../utils/search';
import { useContentTypeFilter, useDefaultSearchFilters } from '../../app/data';

const PopularResultsIndex = ({ title, numberResultsToDisplay, indexName }) => {
  const filters = useDefaultSearchFilters();
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
    <Index indexName={indexName} indexId={`popular-${title}`}>
      <Configure {...searchConfig} />
      <PopularResults title={title} numberResultsToDisplay={numberResultsToDisplay} />
    </Index>
  );
};

PopularResultsIndex.propTypes = {
  title: PropTypes.string.isRequired,
  numberResultsToDisplay: PropTypes.number,
  indexName: PropTypes.string,
};

PopularResultsIndex.defaultProps = {
  numberResultsToDisplay: NUM_RESULTS_TO_DISPLAY,
  indexName: undefined,
};

export default PopularResultsIndex;
