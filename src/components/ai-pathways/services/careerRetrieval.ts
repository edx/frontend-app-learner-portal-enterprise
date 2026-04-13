import { SearchIndex } from 'algoliasearch/lite';
import AlgoliaFilterBuilder from '../../AlgoliaFilterBuilder/AlgoliaFilterBuilder';
import {
  XpertIntent,
  CareerCardModel,
  FacetBootstrapContext,
  TaxonomyResult,
} from '../types';

const DEFAULT_HITS_PER_PAGE = 10;

const normalizeString = (value?: string | null): string => (value || '').trim();

const quoteFacetValue = (value: string): string => `"${value.replace(/"/g, '\\"')}"`;

const buildOptionalSkillFilter = (skill: string, score?: number): string => {
  const quotedSkill = `skills.name:${quoteFacetValue(skill)}`;

  if (!score) {
    return quotedSkill;
  }

  return `${quotedSkill}<score=${score}>`;
};

const isNonEmptyString = (value?: string | null): value is string => Boolean(normalizeString(value));

const dedupeStrings = (values: Array<string | undefined | null>): string[] => {
  const seen = new Set<string>();

  return values
    .map(normalizeString)
    .filter(Boolean)
    .filter((value) => {
      if (seen.has(value)) {
        return false;
      }

      seen.add(value);
      return true;
    });
};

const mapTaxonomyResultToCareerCard = (hit: TaxonomyResult): CareerCardModel => ({
  id: String(hit.id || hit.objectID || ''),
  title: hit.name || '',
  description: hit.description || '',
  skills: (hit.skills || []).map((skill) => skill.name).filter(Boolean),
  industries: hit.industry_names || [],
  similarJobs: hit.similar_jobs || [],
  jobSources: hit.job_sources || [],
  marketData: {
    medianSalary: hit.job_postings?.[0]?.median_salary,
    uniquePostings: hit.job_postings?.[0]?.unique_postings,
  },
  raw: hit,
});

const buildFilters = (intent: XpertIntent): string | undefined => {
  const builder = new AlgoliaFilterBuilder();

  const industries = dedupeStrings(intent.industries || []);
  const jobSources = dedupeStrings(intent.jobSources || []);
  const excludeTags = dedupeStrings(intent.excludeTags || []);

  if (industries.length) {
    builder.or('industry_names', industries, { stringify: true });
  }

  if (jobSources.length) {
    builder.or('job_sources', jobSources, { stringify: true });
  }

  excludeTags.forEach((tag) => {
    builder.andRaw(`NOT skills.name:${quoteFacetValue(tag)}`);
  });

  const builtFilters = builder.build();

  return isNonEmptyString(builtFilters) ? builtFilters : undefined;
};

const buildOptionalFilters = (intent: XpertIntent): string[] | undefined => {
  const requiredSkills = dedupeStrings(intent.skillsRequired || []);
  const preferredSkills = dedupeStrings(intent.skillsPreferred || []);

  const optionalFilters = [
    ...requiredSkills.map((skill) => buildOptionalSkillFilter(skill)),
    ...preferredSkills.map((skill) => buildOptionalSkillFilter(skill, 1)),
  ];

  return optionalFilters.length ? optionalFilters : undefined;
};

const buildCareerQuery = (intent: XpertIntent): string => {
  const condensedQuery = normalizeString(intent.condensedQuery);

  if (condensedQuery) {
    return condensedQuery;
  }

  const fallbackTerms = dedupeStrings([
    ...(intent.roles || []),
    ...(intent.skillsRequired || []),
  ]);

  return fallbackTerms[0] || '';
};

/**
 * Service for deterministic career retrieval from the taxonomy/job Algolia index.
 *
 * Notes:
 * - This service is for career retrieval only.
 * - It maps taxonomy records using `name`, `industry_names`, and `skills[].name`.
 * - `filters` are used for hard constraints.
 * - `optionalFilters` are used only as ranking boosts.
 */
export const careerRetrievalService = {
  async searchCareers(
    index: SearchIndex,
    intent: XpertIntent,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _context?: FacetBootstrapContext,
  ): Promise<CareerCardModel[]> {
    const query = buildCareerQuery(intent);
    const filters = buildFilters(intent);
    const optionalFilters = buildOptionalFilters(intent);

    const searchParams: Record<string, unknown> = {
      hitsPerPage: DEFAULT_HITS_PER_PAGE,
    };

    if (filters) {
      searchParams.filters = filters;
    }

    if (optionalFilters?.length) {
      searchParams.optionalFilters = optionalFilters;
    }

    const response = await index.search<TaxonomyResult>(query, searchParams);

    return response.hits.map(mapTaxonomyResultToCareerCard);
  },
};
