import { connectStateResults } from 'react-instantsearch-dom';
import { adaptAlgoliaHitsToCandidates, AlgoliaCourseHit } from '../services/algolia.adapters';
import { PathwayCourse } from '../types';

interface StateResults {
  searchState: any;
  searchResults: {
    hits: AlgoliaCourseHit[];
    nbHits: number;
    page: number;
    nbPages: number;
    hitsPerPage: number;
    processingTimeMS: number;
    query: string;
    params: string;
    index: string;
  } | null;
  allSearchResults: any;
  isSearchStalled: boolean;
  error: Error | null;
}

/**
 * Internal hook (via connectStateResults) to consume and adapt Algolia search hits
 * into stable PathwayCourse models.
 */
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
