import { useMemo } from 'react';
import algoliasearch from 'algoliasearch/lite';
import type { SearchClient, SearchIndex } from 'algoliasearch/lite';
import { getConfig } from '@edx/frontend-platform/config';

type CatalogAlgoliaResult = {
  searchClient: SearchClient | null;
  searchIndex: SearchIndex | null;
};

/**
 * Pathways-tab-owned duplicate of the ai-pathways prototype's
 * useCatalogAlgoliaSearch hook (not imported from src/components/ai-pathways,
 * a throwaway prototype) — reads the same stage-override config keys to reach
 * a real prod Algolia app/index for realistic catalog data, so this feature
 * owns its own copy of the technique rather than depending on the prototype.
 * Returns null for both when either override key is absent so callers can
 * fall back to the production-secured useAlgoliaSearch index.
 */
export default function useCatalogAlgoliaSearch(
  indexName: string | null = null,
): CatalogAlgoliaResult {
  const config = getConfig();

  return useMemo(() => {
    const appId = config.ALGOLIA_STAGE_APP_ID_OVERRIDE;
    const apiKey = config.ALGOLIA_STAGE_SEARCH_API_KEY_OVERRIDE;
    const resolvedIndex = indexName || config.ALGOLIA_INDEX_NAME_V2 || config.ALGOLIA_INDEX_NAME;

    if (!appId || !apiKey || !resolvedIndex) {
      return { searchClient: null, searchIndex: null };
    }

    const client = algoliasearch(appId, apiKey);
    return {
      searchClient: client,
      searchIndex: client.initIndex(resolvedIndex),
    };
  }, [
    config.ALGOLIA_STAGE_APP_ID_OVERRIDE,
    config.ALGOLIA_STAGE_SEARCH_API_KEY_OVERRIDE,
    config.ALGOLIA_INDEX_NAME_V2,
    config.ALGOLIA_INDEX_NAME,
    indexName,
  ]);
}
