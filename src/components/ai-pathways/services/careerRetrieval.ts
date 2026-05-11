import { SearchIndex } from 'algoliasearch/lite';
import AlgoliaFilterBuilder from '../../AlgoliaFilterBuilder/AlgoliaFilterBuilder';
import {
  XpertIntent,
  CareerCardModel,
  TaxonomyResult,
} from '../types';

import {
  CAREER_RETRIEVAL_LIMIT,
  FACET_FIELDS,
  CAREER_REQUIRED_OPTIONAL_FILTER_LIMIT,
  CAREER_PREFERRED_OPTIONAL_FILTER_LIMIT,
} from '../constants';
import { isMalformedCompound } from './skillTiering';

/**
 * Utility to clean and normalize search strings.
 */
const normalizeString = (value?: string | null): string => (value || '').trim();

/**
 * Escapes and quotes a facet value for use in Algolia filters.
 */
const quoteFacetValue = (value: string): string => `"${value.replace(/"/g, '\\"')}"`;

/**
 * Builds an optional filter string with an optional relevance score (boosting).
 *
 * @param skill The skill name to filter/boost.
 * @param score Optional boosting score.
 * @returns A formatted Algolia optional filter string.
 */
const buildOptionalSkillFilter = (skill: string, score?: number): string => {
  const quotedSkill = `${FACET_FIELDS.SKILLS_DOT_NAME}:${quoteFacetValue(skill)}`;

  if (!score) {
    return quotedSkill;
  }

  return `${quotedSkill}<score=${score}>`;
};

/**
 * Checks if a value is a non-empty, trimmed string.
 */
const isNonEmptyString = (value?: string | null): value is string => Boolean(normalizeString(value));

/**
 * Removes duplicates and empty values from a string array.
 */
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

/**
 * Normalizes a raw Algolia taxonomy hit into a UI-ready CareerCardModel.
 *
 * @param hit The raw record retrieved from the Algolia taxonomy index.
 * @returns A structured model for the Career Match card.
 */
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
  percentMatch: 0.95,
});

/**
 * Constructs the Algolia hard filters (must-match) based on the extracted intent.
 *
 * @param intent The structured search intent.
 * @returns A string representing the Algolia filter expression, or undefined.
 */
const buildFilters = (intent: XpertIntent): string | undefined => {
  const builder = new AlgoliaFilterBuilder();

  const industries = dedupeStrings(intent.industries || []);
  const jobSources = dedupeStrings(intent.jobSources || []);
  const excludeTags = dedupeStrings(intent.excludeTags || []);

  if (industries.length) {
    builder.or(FACET_FIELDS.INDUSTRY_NAMES, industries, { stringify: true });
  }

  if (jobSources.length) {
    builder.or(FACET_FIELDS.JOB_SOURCES, jobSources, { stringify: true });
  }

  excludeTags.forEach((tag) => {
    builder.andRaw(`NOT ${FACET_FIELDS.SKILLS_DOT_NAME}:${quoteFacetValue(tag)}`);
  });

  const builtFilters = builder.build();

  return isNonEmptyString(builtFilters) ? builtFilters : undefined;
};

/**
 * Constructs the Algolia optional filters (boosting) based on the extracted intent.
 * Required (broad) skills are boosted from skillsRequired; preferred (tools/languages)
 * are boosted at a lower weight, capped, and excluded for beginner learners.
 */
const buildOptionalFilters = (intent: XpertIntent): string[] | undefined => {
  const requiredSkills = dedupeStrings(intent.skillsRequired || [])
    .filter((s) => !isMalformedCompound(s))
    .slice(0, CAREER_REQUIRED_OPTIONAL_FILTER_LIMIT);

  const preferredSkills = intent.learnerLevel === 'beginner'
    ? []
    : dedupeStrings(intent.skillsPreferred || [])
      .filter((s) => !isMalformedCompound(s))
      .slice(0, CAREER_PREFERRED_OPTIONAL_FILTER_LIMIT);

  const optionalFilters = [
    ...requiredSkills.map((skill) => buildOptionalSkillFilter(skill)),
    ...preferredSkills.map((skill) => buildOptionalSkillFilter(skill, 1)),
  ];

  return optionalFilters.length ? optionalFilters : undefined;
};

/**
 * Derives the primary search query for the taxonomy search.
 * Prioritizes the AI-generated condensedQuery, falling back to roles or required skills.
 *
 * @param intent The structured search intent.
 * @returns The final query string.
 */
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
 * Service for deterministic career retrieval from the Algolia taxonomy index.
 *
 * Pipeline context: This is the 'career retrieval' phase. It uses the structured
 * `XpertIntent` to query the taxonomy index for professional roles that align
 * with the user's background and goals.
 *
 * The results are presented to the user as "Career Matches" to choose from.
 */
export const careerRetrievalService = {
  /**
   * Searches the taxonomy index for careers matching the provided intent.
   *
   * @param index The Algolia SearchIndex for the taxonomy catalog.
   * @param intent The structured search intent extracted from user input.
   * @returns A promise resolving to an array of normalized CareerCardModels.
   */
  async searchCareers(
    index: SearchIndex,
    intent: XpertIntent,
  ): Promise<CareerCardModel[]> {
    const query = buildCareerQuery(intent);
    const filters = buildFilters(intent);
    const optionalFilters = buildOptionalFilters(intent);

    const searchParams: Record<string, unknown> = {
      hitsPerPage: CAREER_RETRIEVAL_LIMIT,
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
