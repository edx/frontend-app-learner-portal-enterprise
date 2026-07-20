import type { SearchIndex } from 'algoliasearch/lite';
import { AlgoliaFilterBuilder } from '../../../../../AlgoliaFilterBuilder';
import { isMalformedCompound, normalizeString, quoteFacetValue } from './algoliaStrings';
import type { CareerMatch } from '../state';
import type { CareerSearchIntent } from '../types';

/** Maximum number of career taxonomy hits requested per search. */
const CAREER_RETRIEVAL_LIMIT = 10;
/** Maximum number of required-skill optional filters applied to a single search. */
const CAREER_REQUIRED_OPTIONAL_FILTER_LIMIT = 4;
/** Maximum number of preferred-skill optional filters applied to a single search. */
const CAREER_PREFERRED_OPTIONAL_FILTER_LIMIT = 2;

const FACET_FIELDS = {
  INDUSTRY_NAMES: 'industry_names',
  JOB_SOURCES: 'job_sources',
  SKILLS_DOT_NAME: 'skills.name',
} as const;

/**
 * Raw taxonomy record fields consumed from the career/taxonomy Algolia index. Kept
 * private to this service — never exported or returned to callers.
 */
interface TaxonomyCareerHit {
  id?: string | number;
  objectID?: string;
  name?: string;
  skills?: Array<{ name?: string }>;
}

const isNonEmptyString = (value?: string | null): value is string => Boolean(normalizeString(value));

const dedupeStrings = (values: Array<string | undefined | null>): string[] => (
  Array.from(new Set(values.map(normalizeString).filter(Boolean)))
);

const buildOptionalSkillFilter = (skill: string, score?: number): string => {
  const quotedSkill = `${FACET_FIELDS.SKILLS_DOT_NAME}:${quoteFacetValue(skill)}`;
  return score ? `${quotedSkill}<score=${score}>` : quotedSkill;
};

/**
 * Derives the primary search query for the taxonomy search: the AI-generated condensed
 * query first, falling back to the first normalized role or required skill.
 */
const buildCareerQuery = (intent: CareerSearchIntent): string => {
  const condensedQuery = normalizeString(intent.condensedAlgoliaQuery);

  if (condensedQuery) {
    return condensedQuery;
  }

  const fallbackTerms = dedupeStrings([...(intent.roles ?? []), ...intent.skillsRequired]);
  return fallbackTerms[0] || '';
};

/**
 * Builds the Algolia hard filters (must-match) from industries, job sources, and
 * excluded tags. Returns `undefined` when no hard filter applies.
 */
const buildFilters = (intent: CareerSearchIntent): string | undefined => {
  const builder = new AlgoliaFilterBuilder();

  const industries = dedupeStrings(intent.industries ?? []);
  const jobSources = dedupeStrings(intent.jobSources ?? []);
  const excludeTags = dedupeStrings(intent.excludeTags ?? []);

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
 * Builds Algolia `optionalFilters` (soft-boosting) from required and preferred skills.
 * Required skills are unscored, higher-weight signals; preferred skills are added at a
 * lower weight and are suppressed entirely for introductory learners to avoid
 * over-narrowing. Malformed compound skill strings (e.g. "SQL & Python") are dropped.
 */
const buildOptionalFilters = (intent: CareerSearchIntent): string[] | undefined => {
  const requiredSkillFilters = dedupeStrings(intent.skillsRequired)
    .filter((skill) => !isMalformedCompound(skill))
    .slice(0, CAREER_REQUIRED_OPTIONAL_FILTER_LIMIT);

  const preferredSkillFilters = intent.learnerLevel === 'introductory'
    ? []
    : dedupeStrings(intent.skillsPreferred)
      .filter((skill) => !isMalformedCompound(skill))
      .slice(0, CAREER_PREFERRED_OPTIONAL_FILTER_LIMIT);

  const optionalFilters = [
    ...requiredSkillFilters.map((skill) => buildOptionalSkillFilter(skill)),
    ...preferredSkillFilters.map((skill) => buildOptionalSkillFilter(skill, 1)),
  ];

  return optionalFilters.length ? optionalFilters : undefined;
};

/**
 * Maps a raw taxonomy hit to the existing `CareerMatch` domain model. Returns `null`
 * for hits that cannot produce both a non-empty identifier and a non-empty title,
 * rather than fabricating placeholder values. `matchPercentage` and `laborMarketTrend`
 * are always omitted — no verified compatible domain value exists for them yet.
 */
const mapTaxonomyHitToCareerMatch = (hit: TaxonomyCareerHit): CareerMatch | null => {
  const id = normalizeString(String(hit.id ?? hit.objectID ?? ''));
  const title = normalizeString(hit.name);

  if (!id || !title) {
    return null;
  }

  const skillsToDevelop = dedupeStrings((hit.skills || []).map((skill) => skill.name));

  return {
    id,
    title,
    ...(skillsToDevelop.length ? { skillsToDevelop } : {}),
  };
};

/**
 * Service for deterministic career retrieval from the Algolia career/taxonomy index.
 * Transforms a normalized `CareerSearchIntent` into one taxonomy search and maps the
 * results into the existing `CareerMatch[]` domain model.
 */
export const careerRetrievalService = {
  /**
   * Queries the given career/taxonomy index for roles matching the learner's intent,
   * then maps the raw hits into `CareerMatch[]`. Makes exactly one search request; the
   * configured index must be injected by the caller.
   *
   * @param index The configured Algolia `SearchIndex` for the career/taxonomy catalog.
   * @param intent The normalized search intent.
   * @returns The mapped career matches, in Algolia result order.
   */
  async searchCareers(index: SearchIndex, intent: CareerSearchIntent): Promise<CareerMatch[]> {
    const query = buildCareerQuery(intent);
    const filters = buildFilters(intent);
    const optionalFilters = buildOptionalFilters(intent);

    const searchParams: Record<string, unknown> = {
      hitsPerPage: CAREER_RETRIEVAL_LIMIT,
    };

    if (filters) {
      searchParams.filters = filters;
    }

    if (optionalFilters) {
      searchParams.optionalFilters = optionalFilters;
    }

    const response = await index.search<TaxonomyCareerHit>(query, searchParams);

    return response.hits
      .map(mapTaxonomyHitToCareerMatch)
      .filter((careerMatch): careerMatch is CareerMatch => careerMatch !== null);
  },
};
