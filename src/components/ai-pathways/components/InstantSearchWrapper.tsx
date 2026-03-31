import React, { useMemo, useState, ReactNode } from 'react';
import { InstantSearch, Configure } from 'react-instantsearch-dom';
import { SearchClient } from 'algoliasearch/lite';
import { buildAlgoliaRequest } from '../services/algoliaRequestBuilder';
import { contentDiscoveryService } from '../services/contentDiscovery.service';
import { SearchIntent } from '../types';

interface InstantSearchWrapperProps {
  searchClient: SearchClient;
  indexName: string;
  initialIntent: SearchIntent;
  children: ReactNode;
  context: {
    enterpriseCustomerUuid?: string;
    catalogQueryUuids?: string[];
    locale?: string;
  };
}

/**
 * Context for sharing refinement state and actions.
 */
export const RefinementContext = React.createContext<{
  intent: SearchIntent;
  setIntent: (intent: SearchIntent) => void;
} | null>(null);

/**
 * Provides an InstantSearch context for AI Pathways refinement.
 * Automatically computes filters and parameters based on SearchIntent.
 */
export const InstantSearchWrapper = ({
  searchClient,
  indexName,
  initialIntent,
  children,
  context,
}: InstantSearchWrapperProps) => {
  const [intent, setIntent] = useState(initialIntent);

  // Compute Algolia request parameters from intent
  const requestInput = useMemo(
    () => buildAlgoliaRequest({
      intent,
      mode: 'refinement',
      context,
    }),
    [intent, context],
  );

  // Compute the final filter string
  const filters = useMemo(
    () => contentDiscoveryService.buildFilters(requestInput),
    [requestInput],
  );

  // Compute optional filters for ranking
  const optionalFilters = useMemo(
    () => {
      const result: string[] = [];
      Object.entries(requestInput.optionalFilters || {}).forEach(([attribute, values]) => {
        values.forEach(value => result.push(`${attribute}:${value}`));
      });
      return result;
    },
    [requestInput],
  );

  return (
    <RefinementContext.Provider value={{ intent, setIntent }}>
      <InstantSearch searchClient={searchClient} indexName={indexName}>
        <Configure
          filters={filters}
          optionalFilters={optionalFilters}
          query={requestInput.query}
          facets={['skills.name', 'industry_names', 'job_sources']}
          hitsPerPage={requestInput.hitsPerPage}
          attributesToRetrieve={requestInput.attributesToRetrieve}
          analyticsTags={['ai-pathways', 'mode:refinement']}
        />
        {children}
      </InstantSearch>
    </RefinementContext.Provider>
  );
};
