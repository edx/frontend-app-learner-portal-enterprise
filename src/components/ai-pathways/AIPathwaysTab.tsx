import React from 'react';
import { Configure, InstantSearch } from 'react-instantsearch-dom';
import { getConfig } from '@edx/frontend-platform';
import { useAlgoliaSearch } from '../app/data';
import { AiPathwaysPage } from './routes/AiPathwaysPage';

/**
 * AIPathwaysTab is the dashboard integration point for the AI Pathways feature.
 * It renders the main AiPathwaysPage prototype.
 */
export const AIPathwaysTab = () => {
  const config = getConfig();
  const { searchClient, searchIndex } = useAlgoliaSearch(config.ALGOLIA_INDEX_NAME);

  return (
    <>
      <AiPathwaysPage />
      {(searchClient && searchIndex) && (
        <InstantSearch
          searchClient={searchClient}
          indexName={searchIndex.indexName}
        >
          <Configure facets={['*']} hitsPerPage={0} />
        </InstantSearch>
      )}
    </>
  );
};

export default AIPathwaysTab;
