import type { SearchIndex } from 'algoliasearch/lite';
import algoliasearch from 'algoliasearch';
import { getConfig } from '@edx/frontend-platform/config';

/**
 * `?debug=true` opt-in gate for the stage "override catalog" (`ai-pathways`'s
 * `useCatalogAlgoliaSearch` prefers it automatically whenever the override keys happen
 * to be configured, with no user-facing control). Here it's explicit per-request, not an
 * ambient environment behavior.
 */
const isDebugCatalogOverrideEnabled = (): boolean => (
  typeof window !== 'undefined'
  && new URLSearchParams(window.location.search).get('debug') === 'true'
);

/**
 * Resolves the stage "override catalog" Algolia course index when explicitly opted into
 * via `?debug=true` in the URL, with both `ALGOLIA_STAGE_APP_ID_OVERRIDE`/
 * `ALGOLIA_STAGE_SEARCH_API_KEY_OVERRIDE` configured. Returns `null` otherwise, so the
 * caller (`usePathwaysController`) falls through to the normal, secured-key course index
 * `useAlgoliaSearch` resolves — that hook has no equivalent debug/stage-override
 * capability of its own, which is why this narrow, non-hook piece still exists
 * standalone rather than folding into it.
 */
export const getDebugCourseAlgoliaIndexOverride = (): SearchIndex | null => {
  const config = getConfig();

  if (
    isDebugCatalogOverrideEnabled()
    && config.ALGOLIA_STAGE_APP_ID_OVERRIDE
    && config.ALGOLIA_STAGE_SEARCH_API_KEY_OVERRIDE
  ) {
    const resolvedIndexName = config.ALGOLIA_INDEX_NAME_V2 || config.ALGOLIA_INDEX_NAME;
    const overrideClient = algoliasearch(
      config.ALGOLIA_STAGE_APP_ID_OVERRIDE,
      config.ALGOLIA_STAGE_SEARCH_API_KEY_OVERRIDE,
    );
    return overrideClient.initIndex(resolvedIndexName);
  }

  return null;
};
