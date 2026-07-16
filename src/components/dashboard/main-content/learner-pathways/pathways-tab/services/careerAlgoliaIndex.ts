import type { SearchIndex } from 'algoliasearch/lite';
import algoliasearch from 'algoliasearch';
import { getConfig } from '@edx/frontend-platform/config';

/**
 * Resolves the configured Algolia `SearchIndex` for the career/taxonomy index
 * (`ALGOLIA_INDEX_NAME_JOBS`) that `careerRetrievalService.searchCareers` is injected
 * with. Non-hook, synchronous composition, so a plain workflow function can call it
 * directly (React hooks may only run inside components/hooks) — the one existing
 * non-hook Algolia precedent in this repo
 * (`src/components/ai-pathways/services/catalogFacetService.ts`) targets the
 * course-catalog index, not jobs/taxonomy, so this is a narrow sibling for that index.
 */
export const getCareerAlgoliaIndex = (): SearchIndex => {
  const config = getConfig();
  const searchClient = algoliasearch(config.ALGOLIA_APP_ID, config.ALGOLIA_SEARCH_API_KEY);
  return searchClient.initIndex(config.ALGOLIA_INDEX_NAME_JOBS);
};
