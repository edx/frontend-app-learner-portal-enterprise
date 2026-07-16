import React from 'react';
import { render, screen } from '@testing-library/react';
import { IntlProvider } from '@edx/frontend-platform/i18n';
import '@testing-library/jest-dom/extend-expect';

import { LEARNING_TYPE_EXECUTIVE_EDUCATION } from '@2uinc/frontend-enterprise-catalog-search/data/constants';
import ContentTypeSearchResultsContainer from '../ContentTypeSearchResultsContainer';
import {
  CONTENT_TYPE_COURSE,
  CONTENT_TYPE_PATHWAY,
  CONTENT_TYPE_PROGRAM,
  CONTENT_TYPE_VIDEO,
} from '../constants';

jest.mock('../SearchExecutiveEducation', () => function MockSearchExecutiveEducation(
  props: { filter: string; indexName: string },
) {
  return <div data-testid="search-executive-education" data-filter={props.filter} data-index-name={props.indexName} />;
});

jest.mock('../SearchResults', () => function MockSearchResults(
  props: { contentType?: string; title: string },
) {
  return <div data-testid="search-results" data-content-type={props.contentType} data-title={props.title} />;
});

const renderContainer = (
  props: Partial<React.ComponentProps<typeof ContentTypeSearchResultsContainer>> = {},
) => render(
  <IntlProvider locale="en">
    <ContentTypeSearchResultsContainer indexName="mock-index-name" {...props} />
  </IntlProvider>,
);

describe('<ContentTypeSearchResultsContainer />', () => {
  it('renders Executive Education when learningType is selected, even alongside a course contentType refinement', () => {
    renderContainer({
      contentType: CONTENT_TYPE_COURSE,
      learningType: LEARNING_TYPE_EXECUTIVE_EDUCATION,
      learningTypeFilter: 'learning_type:"Executive Education" AND content_type:course',
    });

    const executiveEducationEl = screen.getByTestId('search-executive-education');
    expect(executiveEducationEl).toBeInTheDocument();
    expect(executiveEducationEl).toHaveAttribute('data-filter', 'learning_type:"Executive Education" AND content_type:course');
    expect(executiveEducationEl).toHaveAttribute('data-index-name', 'mock-index-name');
    expect(screen.queryByTestId('search-results')).not.toBeInTheDocument();
  });

  it('renders Executive Education when learningType is selected with no contentType refinement', () => {
    renderContainer({
      learningType: LEARNING_TYPE_EXECUTIVE_EDUCATION,
      learningTypeFilter: 'learning_type:"Executive Education"',
    });

    expect(screen.getByTestId('search-executive-education')).toBeInTheDocument();
  });

  it('renders nothing when learningType is Executive Education but learningTypeFilter is missing', () => {
    const { container } = renderContainer({
      learningType: LEARNING_TYPE_EXECUTIVE_EDUCATION,
    });

    expect(screen.queryByTestId('search-executive-education')).not.toBeInTheDocument();
    expect(container).toBeEmptyDOMElement();
  });

  it('falls back to the generic course results when learningType is not Executive Education', () => {
    renderContainer({ contentType: CONTENT_TYPE_COURSE });

    expect(screen.getByTestId('search-results')).toHaveAttribute('data-content-type', CONTENT_TYPE_COURSE);
    expect(screen.queryByTestId('search-executive-education')).not.toBeInTheDocument();
  });

  it.each([CONTENT_TYPE_PATHWAY, CONTENT_TYPE_PROGRAM, CONTENT_TYPE_VIDEO])(
    'renders the matching generic results section for contentType %s',
    (contentType) => {
      renderContainer({ contentType });

      expect(screen.getByTestId('search-results')).toHaveAttribute('data-content-type', contentType);
    },
  );

  it('renders nothing when neither contentType nor a matching learningType is provided', () => {
    const { container } = renderContainer({});

    expect(container).toBeEmptyDOMElement();
  });
});
