import { useContext } from 'react';
import { SearchContext } from '@2uinc/frontend-enterprise-catalog-search';
import FacetListRefinement from '@2uinc/frontend-enterprise-catalog-search/FacetListRefinement';
import PropTypes from 'prop-types';
import { useIntl } from '@edx/frontend-platform/i18n';
import { CURRENT_JOB_FACET } from './constants';
import jobMessages from './jobMessages';

const CurrentJobDropdown = ({ isStyleAutoSuggest, isChip }) => {
  const intl = useIntl();
  const { refinements } = useContext(SearchContext);
  const {
    attribute,
    typeaheadOptions,
    facetValueType,
    customAttribute,
  } = CURRENT_JOB_FACET;
  const title = intl.formatMessage(jobMessages.currentJobLabel);
  const localizedTypeaheadOptions = {
    ...typeaheadOptions,
    placeholder: intl.formatMessage(jobMessages.currentJobSearchPlaceholder),
    ariaLabel: intl.formatMessage(jobMessages.currentJobSearchAriaLabel),
  };

  return (
    <FacetListRefinement
      key={attribute}
      title={
        refinements[customAttribute]?.length > 0
          ? refinements[customAttribute][0]
          : title
      }
      label={title}
      attribute={attribute}
      limit={300} // this is replicating the B2C search experience
      refinements={refinements}
      facetValueType={facetValueType}
      typeaheadOptions={localizedTypeaheadOptions}
      searchable={!!localizedTypeaheadOptions}
      doRefinement={false}
      customAttribute={customAttribute}
      showBadge={false}
      variant="default"
      isStyleAutoSuggest={isStyleAutoSuggest}
      isChip={isChip}
    />
  );
};

CurrentJobDropdown.propTypes = {
  isStyleAutoSuggest: PropTypes.bool,
  isChip: PropTypes.bool,
};

CurrentJobDropdown.defaultProps = {
  isStyleAutoSuggest: false,
  isChip: false,
};

export default CurrentJobDropdown;
