import { useContext } from 'react';
import { SearchContext } from '@2uinc/frontend-enterprise-catalog-search';
import FacetListRefinement from '@2uinc/frontend-enterprise-catalog-search/FacetListRefinement';
import PropTypes from 'prop-types';
import { useIntl } from '@edx/frontend-platform/i18n';
import { DESIRED_JOB_FACET } from './constants';
import jobMessages from './jobMessages';

const SearchJobDropdown = ({
  isStyleAutoSuggest,
  isChip,
  isStyleSearchBox,
}) => {
  const intl = useIntl();
  const { refinements } = useContext(SearchContext);
  const { attribute, typeaheadOptions } = DESIRED_JOB_FACET;
  const title = intl.formatMessage(jobMessages.desiredJobLabel);
  const localizedTypeaheadOptions = {
    ...typeaheadOptions,
    placeholder: intl.formatMessage(jobMessages.desiredJobSearchPlaceholder),
    ariaLabel: intl.formatMessage(jobMessages.desiredJobSearchAriaLabel),
  };

  return (
    <FacetListRefinement
      key={attribute}
      title={title}
      label={title}
      attribute={attribute}
      limit={300} // this is replicating the B2C search experience
      refinements={refinements}
      facetValueType="array"
      typeaheadOptions={localizedTypeaheadOptions}
      searchable={!!localizedTypeaheadOptions}
      doRefinement={false}
      showBadge={false}
      variant="default"
      isStyleAutoSuggest={isStyleAutoSuggest}
      isChip={isChip}
      isStyleSearchBox={isStyleSearchBox}
    />
  );
};
SearchJobDropdown.propTypes = {
  isStyleAutoSuggest: PropTypes.bool,
  isChip: PropTypes.bool,
  isStyleSearchBox: PropTypes.bool,
};

SearchJobDropdown.defaultProps = {
  isStyleAutoSuggest: false,
  isChip: false,
  isStyleSearchBox: false,
};

export default SearchJobDropdown;
