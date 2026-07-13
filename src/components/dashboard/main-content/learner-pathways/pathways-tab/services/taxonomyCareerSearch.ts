import type { SearchIndex } from 'algoliasearch/lite';

import type { CareerMatch } from '../state';

const TAXONOMY_SEARCH_DEFAULT_HITS_PER_PAGE = 10;

export interface TaxonomyHitRaw {
  objectID: string;
  id?: string;
  name?: string;
  skills?: Array<{ name?: string }>;
}

export interface TaxonomyCareerSearchOptions {
  index: SearchIndex;
  query: string;
  skillsRequired?: string[];
  skillsPreferred?: string[];
  hitsPerPage?: number;
}

/**
 * Integration spike (uncommitted): minimal, plain taxonomy/jobs-index Algolia search,
 * modeled on ai-pathways' careerRetrieval.ts query-building principle (query from a
 * condensed string, optional skill filters as soft ranking boosts) — not its full
 * XpertIntent/tiering/alias-map machinery, which our narrower LearningIntentResponse
 * (skillsRequired/skillsPreferred/condensedAlgoliaQuery only) doesn't support and
 * shouldn't be padded with placeholder values to satisfy.
 */
export async function searchTaxonomyCareers(
  {
    index, query, skillsRequired = [], skillsPreferred = [],
    hitsPerPage = TAXONOMY_SEARCH_DEFAULT_HITS_PER_PAGE,
  }: TaxonomyCareerSearchOptions,
): Promise<TaxonomyHitRaw[]> {
  const optionalFilters = [...skillsRequired, ...skillsPreferred]
    .map((skill) => `skills.name:"${skill}"`);
  const { hits } = await index.search<TaxonomyHitRaw>(query, {
    hitsPerPage,
    ...(optionalFilters.length ? { optionalFilters } : {}),
  });
  return hits;
}

/**
 * matchPercentage/laborMarketTrend are intentionally omitted — no real relevance
 * score or labor-market-trend signal exists yet; the Career Selection UI already
 * renders gracefully without them (badge hidden, null percentage always passes the
 * ≤25% visibility filter). Do not fake a "0.95"-style score the way ai-pathways'
 * careerRetrieval.ts does — see the productionization doc for the real ranking gap.
 */
export function mapTaxonomyHitToCareerMatch(hit: TaxonomyHitRaw): CareerMatch {
  return {
    id: String(hit.id ?? hit.objectID ?? ''),
    title: hit.name ?? '',
    skillsToDevelop: (hit.skills ?? []).map((skill) => skill.name).filter(Boolean) as string[],
  };
}
