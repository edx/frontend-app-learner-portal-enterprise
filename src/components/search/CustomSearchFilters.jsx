import { useContext, useMemo } from 'react';
import PropTypes from 'prop-types';
import {
  SearchContext,
  FacetListRefinement,
  LearningTypeRadioFacet,
} from '@2uinc/frontend-enterprise-catalog-search';

const sortItemsByLabelAsc = (items) => [...items].sort((a, b) => a.label.localeCompare(b.label));
const identity = (items) => items;

/**
 * Renders the filter row for the enterprise search page. Passed to
 * `<SearchHeader>` via its `filterComponents` prop so we control facet ordering.
 *
 * Facets are split into two groups based on the `isEndOfRow` flag from
 * `searchFacetFilters`:
 *   - regular facets render first
 *   - the optional `LearningTypeRadioFacet` (env-gated by `LEARNING_TYPE_FACET`)
 *     renders between the two groups
 *   - end-of-row facets (currently `is_new_content`) render last so flex-wrap
 *     pushes them onto their own line, matching the ENT-11384 design.
 */
const CustomSearchFilters = ({ enablePathways, variant }) => {
  const { refinements, searchFacetFilters } = useContext(SearchContext);

  const facetCells = useMemo(() => {
    const regular = [];
    const endOfRow = [];
    searchFacetFilters.forEach((facet) => {
      const cell = (
        <FacetListRefinement
          key={facet.attribute}
          title={facet.title}
          attribute={facet.attribute}
          limit={300}
          transformItems={facet.isSortedAlphabetical ? sortItemsByLabelAsc : identity}
          refinements={refinements}
          defaultRefinement={refinements[facet.attribute]}
          facetValueType="array"
          typeaheadOptions={facet.typeaheadOptions}
          searchable={!!facet.typeaheadOptions}
          variant={variant}
          noDisplay={facet.noDisplay}
        />
      );
      if (facet.isEndOfRow) {
        endOfRow.push(cell);
      } else {
        regular.push(cell);
      }
    });
    return { regular, endOfRow };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(refinements), searchFacetFilters, enablePathways, variant]);

  return (
    <>
      {facetCells.regular}
      {process.env.LEARNING_TYPE_FACET && (
        <LearningTypeRadioFacet enablePathways={enablePathways} />
      )}
      {facetCells.endOfRow}
    </>
  );
};

CustomSearchFilters.propTypes = {
  enablePathways: PropTypes.bool,
  variant: PropTypes.string,
};

CustomSearchFilters.defaultProps = {
  enablePathways: false,
  variant: 'inverse',
};

export default CustomSearchFilters;
