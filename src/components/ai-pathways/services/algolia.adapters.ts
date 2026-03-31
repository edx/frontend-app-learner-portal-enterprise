import {
  PathwayCourse,
  CourseStatus,
  TaxonomyResult,
  FacetOption,
  TaxonomyFilters,
  CareerOption,
} from '../types';

/**
 * Raw Algolia hit shape as it comes from the taxonomy index.
 */
export type AlgoliaTaxonomyHit = {
  id?: string;
  external_id?: string;
  name?: string;
  description?: string;
  skills?: {
    name: string;
    type_name?: string;
    significance?: number;
  }[];
  industry_names?: string[];
  industries?: string[];
  similar_jobs?: string[];
  job_sources?: string[];
  job_postings?: {
    median_salary?: number;
    unique_postings?: number;
  }[];
  objectID: string;
  [key: string]: unknown;
};

/**
 * Raw Algolia hit shape as it comes from the index (generic).
 */
export type AlgoliaCourseHit = {
  key?: string;
  title?: string;
  skill_names?: string[];
  level_type?: string;
  short_description?: string;
  marketing_url?: string;
  image_url?: string;
  duration?: string;
  [key: string]: unknown;
};

/**
 * Transforms a raw Algolia hit into a normalized TaxonomyResult.
 */
export function adaptAlgoliaTaxonomyHit(hit: AlgoliaTaxonomyHit): TaxonomyResult {
  const primaryPosting = hit.job_postings && hit.job_postings.length > 0 ? hit.job_postings[0] : undefined;

  return {
    id: hit.id || hit.objectID,
    title: hit.name || 'Untitled Role',
    description: hit.description || '',
    skills: (hit.skills || []).map(s => ({
      name: s.name,
      typeName: s.type_name,
      significance: s.significance,
    })),
    industries: hit.industry_names || [],
    similarJobs: hit.similar_jobs || [],
    jobSources: hit.job_sources || [],
    marketData: primaryPosting ? {
      medianSalary: primaryPosting.median_salary,
      uniquePostings: primaryPosting.unique_postings,
    } : undefined,
    reasoning: '', // Assigned by assembly/enrichment logic
  };
}

/**
 * Normalizes a list of taxonomy hits.
 */
export function adaptAlgoliaTaxonomyHits(hits: AlgoliaTaxonomyHit[]): TaxonomyResult[] {
  return hits.map(hit => adaptAlgoliaTaxonomyHit(hit));
}

/**
 * Normalizes raw Algolia facets into TaxonomyFilters.
 */
export function adaptAlgoliaFacets(facets: Record<string, Record<string, number>>): TaxonomyFilters {
  const normalize = (facetName: string): FacetOption[] => {
    const rawOptions = facets[facetName] || {};
    return Object.entries(rawOptions)
      .map(([value, count]) => ({
        label: value,
        value,
        count,
        isRefined: false,
      }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label)); // Sort by count desc then label asc
  };

  return {
    skills: normalize('skills.name'),
    industries: normalize('industry_names'),
    jobSources: normalize('job_sources'),
  };
}

/**
 * Maps TaxonomyResults back to CareerOption matches for the profile page.
 */
export function adaptTaxonomyResultsToCareerOptions(results: TaxonomyResult[]): CareerOption[] {
  return results.map(result => ({
    title: result.title,
    skills: result.skills.slice(0, 5).map(s => s.name),
    percentMatch: 0.9, // Default match score for retrieval-based results
  }));
}

/**
 * Transforms a raw Algolia hit into a normalized PathwayCourse.
 */
export function adaptAlgoliaCourseHit(hit: AlgoliaCourseHit, index: number): PathwayCourse {
  return {
    id: hit.key || `temp_${index}`,
    title: hit.title || 'Untitled Course',
    level: hit.level_type || 'Introductory',
    skills: hit.skill_names || [],
    shortDescription: hit.short_description || '',
    imageUrl: hit.image_url || '',
    marketingUrl: hit.marketing_url || '',
    reasoning: '', // Placeholder (assigned by Pathway Assembler)
    status: 'not started' as CourseStatus, // Placeholder (assigned by Pathway Assembler)
    order: index + 1, // Default to retrieval order
  };
}

/**
 * Normalizes a list of hits into a candidate set for pathway assembly.
 */
export function adaptAlgoliaHitsToCandidates(hits: AlgoliaCourseHit[]): PathwayCourse[] {
  return hits.map((hit, index) => adaptAlgoliaCourseHit(hit, index));
}
