import React from 'react';
import { act, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';

import FacetListFreeAll from '../FacetListFreeAll';

import { renderWithRouter } from '../../../utils/tests';
import { NO_OPTIONS_FOUND } from '../data/constants';

const TITLE = 'Free / All';
const propsForNoItems = {
  items: [],
  title: TITLE,
  showAllCatalogs: false,
  setShowAllCatalogs: () => {},
};

const FREE_LABEL = 'Free';
const NOT_FREE_LABEL = 'Not free';
const propsWithItems = {
  ...propsForNoItems,
  items: [{
    label: FREE_LABEL,
    value: true,
  },
  {
    label: NOT_FREE_LABEL,
    value: false,
  },
  ],
};

describe('<FacetListFreeAll />', () => {
  test('renders with no options', async () => {
    renderWithRouter(<FacetListFreeAll {...propsForNoItems} />);

    // assert facet title exists
    expect(screen.queryByText(TITLE)).toBeInTheDocument();

    // assert there are no options
    await act(async () => {
      fireEvent.click(screen.queryByText(TITLE));
    });
    expect(screen.queryByText(NO_OPTIONS_FOUND)).toBeInTheDocument();
  });

  test('renders with options', async () => {
    renderWithRouter(<FacetListFreeAll {...propsWithItems} />);

    // assert the "no options" message does not show
    expect(screen.queryByText(NO_OPTIONS_FOUND)).not.toBeInTheDocument();

    // assert the refinements appear with appropriate counts
    await act(async () => {
      fireEvent.click(screen.queryByText(TITLE));
    });
    expect(screen.queryByText(FREE_LABEL)).toBeInTheDocument();
    expect(screen.queryByText(NOT_FREE_LABEL)).toBeInTheDocument();
  });

  test('renders with options', async () => {
    renderWithRouter(<FacetListFreeAll {...propsWithItems} />);

    // assert the "no options" message does not show
    await act(async () => {
      fireEvent.click(screen.queryByText(TITLE));
    });
    expect(screen.queryByText(NO_OPTIONS_FOUND)).not.toBeInTheDocument();

    // assert the refinements appear with appropriate styles
    expect(screen.queryByText(FREE_LABEL)).toBeInTheDocument();
    expect(screen.queryByText(FREE_LABEL)).toHaveClass('is-refined');

    expect(screen.queryByText(NOT_FREE_LABEL)).toBeInTheDocument();
    expect(screen.queryByText(NOT_FREE_LABEL)).not.toHaveClass('is-refined');
  });

  test('supports clicking on a refinement', async () => {
    const spy = jest.fn();
    renderWithRouter(<FacetListFreeAll
      {...propsWithItems}
      setShowAllCatalogs={spy}
    />);

    // assert the refinements appear
    await act(async () => {
      fireEvent.click(screen.queryByText(TITLE));
    });
    expect(screen.queryByText(FREE_LABEL)).toBeInTheDocument();

    // click a refinement option
    await act(async () => {
      fireEvent.click(screen.queryByText(NOT_FREE_LABEL));
    });

    // assert the spy was called with the correct value
    expect(spy).toHaveBeenCalledWith(!propsWithItems.items[1].value);
  });
});
