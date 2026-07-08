/* eslint-disable object-curly-newline */
/* eslint-disable react/prop-types */
const React = require('react');

const MockReactInstantSearch = jest.genMockFromModule(
  'react-instantsearch-dom',
);

const originalState = {
  hits: [
    {
      objectID: '1',
      title: 'bla',
      key: 'Bees101',
      type: 'course',
      aggregation_key: 'course:Bees101',
      authoring_organizations: [],
      card_image_url: 'https://fake.image',
      course_keys: [],
    },
    {
      objectID: '2',
      title: 'blp',
      key: 'Wasps200',
      type: 'course',
      aggregation_key: 'course:Wasps200',
      authoring_organizations: [],
      card_image_url: 'https://fake.image',
      course_keys: [],
    },
  ],
  nbHits: 2,
};

const mockState = {
  hits: originalState.hits,
  nbHits: originalState.nbHits,
  searchResultsOverride: null,
};

const getDefaultSearchResults = () => ({
  hits: mockState.hits,
  facets: {
    is_new_content: {
      true: mockState.nbHits,
    },
  },
  hitsPerPage: 25,
  nbHits: mockState.nbHits,
  nbPages: mockState.nbHits === 0 ? 0 : 1,
  page: 1,
});

// This allows you to override the built-in hits object
const setFakeHits = hits => {
  mockState.hits = hits;
  mockState.nbHits = hits.length;
};

const resetMockReactInstantSearch = () => {
  mockState.hits = originalState.hits;
  mockState.nbHits = originalState.nbHits;
  mockState.searchResultsOverride = null;
};

const setFakeSearchResultsOverride = searchResultsOverride => {
  mockState.searchResultsOverride = searchResultsOverride;
};

MockReactInstantSearch.connectStateResults = Component => (props) => (
  <Component
    searchResults={{
      ...getDefaultSearchResults(),
      ...(mockState.searchResultsOverride || {}),
    }}
    isSearchStalled={false}
    searchState={{
      page: 1,
    }}
    {...props}
  />
);

MockReactInstantSearch.connectPagination = Component => (props) => (
  <Component
    nbPages={mockState.nbHits === 0 ? 0 : 1}
    currentRefinement={1}
    maxPagesDisplayed={5}
    {...props}
  />
);

MockReactInstantSearch.connectRefinementList = Component => (props) => (
  <Component
    attribute="skills"
    currentRefinement={[]}
    items={[]}
    refinements={{}}
    title="Foo"
    searchForItems={() => {}}
    {...props}
  />
);

const capturedConfigureProps = [];
const capturedInstantSearchProps = [];

MockReactInstantSearch.InstantSearch = function InstantSearch({ children, ...props }) {
  capturedInstantSearchProps.push(props);
  return children;
};
MockReactInstantSearch.Configure = function Configure(props) {
  capturedConfigureProps.push(props);
  return <div>CONFIGURED</div>;
};
MockReactInstantSearch.Index = function Index({ children }) { return children; };

const getCapturedConfigureProps = () => capturedConfigureProps;
const resetCapturedConfigureProps = () => {
  capturedConfigureProps.length = 0;
};

const getCapturedInstantSearchProps = () => capturedInstantSearchProps;
const resetCapturedInstantSearchProps = () => {
  capturedInstantSearchProps.length = 0;
};

// It is necessary to export this way, or tests not using the mock will fail
module.exports = MockReactInstantSearch;
Object.assign(module.exports, {
  setFakeHits,
  setFakeSearchResultsOverride,
  resetMockReactInstantSearch,
  getCapturedConfigureProps,
  resetCapturedConfigureProps,
  getCapturedInstantSearchProps,
  resetCapturedInstantSearchProps,
});
