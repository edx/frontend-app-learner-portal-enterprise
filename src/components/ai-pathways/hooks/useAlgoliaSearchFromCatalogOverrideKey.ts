import { useMemo } from 'react';
import algoliasearch from 'algoliasearch/lite';
import type { SearchClient, SearchIndex } from 'algoliasearch/lite';
import { getConfig } from '@edx/frontend-platform/config';

import useSecuredAlgoliaKeyOverrideFromCatalog from './useSecuredAlgoliaKeyOverrideFromCatalog';

type OverrideAlgoliaResult = {
  searchClient: SearchClient | null;
  searchIndex: SearchIndex | null;
  isLoadingOverrideKey: boolean;
  overrideKeyError: Error | null;
  hasOverrideKey: boolean;
};

/**
 * POC helper for AI Pathways:
 * Builds an Algolia client/index ONLY from the secured key override hook.
 *
 * It does NOT call/use the existing `useAlgoliaSearch` hook at all.
 * If no override key is present, it returns null client/index.
 */
export default function useAlgoliaSearchFromCatalogOverrideKey(
  indexName: string | null = null,
): OverrideAlgoliaResult {
  const config = getConfig();
  const {
    securedAlgoliaApiKeyOverride,
    isLoading,
    error,
  } = useSecuredAlgoliaKeyOverrideFromCatalog();

  return useMemo(() => {
    // No override param / no key => do nothing (this hook is override-only by design).
    if (!securedAlgoliaApiKeyOverride) {
      return {
        searchClient: null,
        searchIndex: null,
        isLoadingOverrideKey: isLoading,
        overrideKeyError: error,
        hasOverrideKey: false,
      };
    }

    // We have an override key but cannot initialize Algolia without base config.
    if (!config.ALGOLIA_APP_ID || !(indexName || config.ALGOLIA_INDEX_NAME)) {
      return {
        searchClient: null,
        searchIndex: null,
        isLoadingOverrideKey: isLoading,
        overrideKeyError: error,
        hasOverrideKey: true,
      };
    }

    const client = algoliasearch(
      config.ALGOLIA_OVERRIDE_APP_ID,
      config.ALGOLIA_OVERRIDE_SEARCH_API_KEY || securedAlgoliaApiKeyOverride,
    );
    const idx = client.initIndex(indexName || config.ALGOLIA_INDEX_NAME);

    return {
      searchClient: client,
      searchIndex: idx,
      isLoadingOverrideKey: isLoading,
      overrideKeyError: error,
      hasOverrideKey: true,
    };
  }, [
    securedAlgoliaApiKeyOverride,
    config.ALGOLIA_APP_ID,
    config.ALGOLIA_INDEX_NAME,
    config.ALGOLIA_OVERRIDE_APP_ID,
    config.ALGOLIA_OVERRIDE_SEARCH_API_KEY,
    indexName,
    isLoading,
    error,
  ]);
}
