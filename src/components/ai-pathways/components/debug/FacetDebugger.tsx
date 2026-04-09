import { connectStateResults } from 'react-instantsearch-dom';

const FacetDebugger = connectStateResults(({ searchResults }) => {
  // eslint-disable-next-line no-console
  console.log(searchResults); // 👈 raw facets

  return null;
});

export default FacetDebugger;
