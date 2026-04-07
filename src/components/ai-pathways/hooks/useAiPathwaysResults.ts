import { connectStateResults } from 'react-instantsearch-dom';
import { adaptAlgoliaHitsToCandidates } from '../services/algolia.adapters';

const Results = ({ searchResults, isSearchStalled, children }: any) => {
  const hits = searchResults?.hits || [];
  const adaptedHits = adaptAlgoliaHitsToCandidates(hits);

  return children({
    hits: adaptedHits,
    isLoading: isSearchStalled,
    totalHits: searchResults?.nbHits || 0,
  });
};

export const useAiPathwaysResults = connectStateResults(Results);
