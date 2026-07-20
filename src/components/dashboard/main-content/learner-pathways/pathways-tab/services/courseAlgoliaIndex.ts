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
 * Resolves the configured Algolia `SearchIndex` for the course catalog
 * (`ALGOLIA_INDEX_NAME_V2` falling back to `ALGOLIA_INDEX_NAME`, matching
 * `useAlgoliaSearch.ts`'s real resolution) that `courseRetrievalService.searchCourses`
 * is injected with. Non-hook, synchronous composition, so a plain workflow function can
 * call it directly — mirrors `getCareerAlgoliaIndex`'s convention for the jobs index.
 *
 * With `?debug=true` in the URL and both `ALGOLIA_STAGE_APP_ID_OVERRIDE`/
 * `ALGOLIA_STAGE_SEARCH_API_KEY_OVERRIDE` configured, resolves the stage override
 * catalog instead. No credential is hard-coded either way — both paths read from
 * `getConfig()`; the override path silently falls through to the normal path when
 * either override key is absent, so this only ever swaps *which configured* credentials
 * are used, gated on an explicit opt-in flag.
 */
export const getCourseAlgoliaIndex = (): SearchIndex => {
  const config = getConfig();
  const resolvedIndexName = config.ALGOLIA_INDEX_NAME_V2 || config.ALGOLIA_INDEX_NAME;

  if (
    isDebugCatalogOverrideEnabled()
    && config.ALGOLIA_STAGE_APP_ID_OVERRIDE
    && config.ALGOLIA_STAGE_SEARCH_API_KEY_OVERRIDE
  ) {
    const overrideClient = algoliasearch(
      config.ALGOLIA_STAGE_APP_ID_OVERRIDE,
      config.ALGOLIA_STAGE_SEARCH_API_KEY_OVERRIDE,
    );
    return overrideClient.initIndex(resolvedIndexName);
  }

  const searchClient = algoliasearch(config.ALGOLIA_APP_ID, config.ALGOLIA_SEARCH_API_KEY);
  return searchClient.initIndex(resolvedIndexName);
};
