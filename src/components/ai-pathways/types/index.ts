/**
 * Feature-local types for the AI Pathways prototype.
 */

/**
 * CourseStatus defines the lifecycle of a course within a pathway.
 */
export type CourseStatus = 'completed' | 'in progress' | 'not started';

/**
 * PathwayCourse represents a single educational item in a personalized pathway.
 */
export interface PathwayCourse {
  id?: string;
  title: string;
  level: string;
  skills: string[];
  reasoning?: string;
  status: CourseStatus;
  order: number;
  shortDescription?: string;
  imageUrl?: string;
  marketingUrl?: string;
}

/**
 * LearningPathway is the top-level collection of recommended courses.
 */
export interface LearningPathway {
  courses: PathwayCourse[];
}

/**
 * CareerOption represents a potential career path matching the user's profile.
 */
export interface CareerOption {
  title: string;
  percentMatch: number;
  skills: string[];
}

/**
 * LearnerProfile summarizes the user's input and matched career opportunities.
 */
export interface LearnerProfile {
  overview: string;
  careerGoal: string;
  targetIndustry: string;
  background: string;
  motivation: string;
  learningStyle: string;
  timeAvailable: string;
  certificate: string;
  careerMatches: CareerOption[];
}

/**
 * SearchIntent represents the normalized output of the intent extraction stage.
 * It is used to drive content discovery (Algolia) and pathway assembly.
 */
export interface SearchIntent {
  /** Target roles or career titles extracted from user goals. */
  roles: string[];

  /** Must-have skills identified for the target role/goal. */
  skillsRequired: string[];

  /** Nice-to-have skills that align with user interests but aren't strictly required. */
  skillsPreferred: string[];

  /** Normalized proficiency level of the learner. */
  learnerLevel?: 'beginner' | 'intermediate' | 'advanced';

  /** Raw search terms to be used in broad text matching. */
  queryTerms?: string[];

  /** Estimated duration preference for the learning journey. */
  timeCommitment?: 'short' | 'medium' | 'long';

  /** Topics or keywords to explicitly exclude from results. */
  excludeTags?: string[];
}

/**
 * CreateLearnerProfileArgs captures raw intake form responses.
 */
export interface CreateLearnerProfileArgs {
  bringsYouHereRes: string;
  careerGoalRes: string;
  learningPrefRes: string;
  backgroundRes: string;
  industryRes: string;
  timeAvailableRes: string;
  certificateRes: string;
}

/**
 * TaxonomyResult represents a single career role or job from the taxonomy index.
 */
export interface TaxonomyResult {
  id: string;
  title: string;
  description: string;
  skills: {
    name: string;
    typeName?: string;
    significance?: number;
  }[];
  industries: string[];
  similarJobs: string[];
  jobSources: string[];
  marketData?: {
    medianSalary?: number;
    uniquePostings?: number;
  };
  reasoning?: string;
}

/**
 * FacetOption represents a single filterable option from an Algolia facet.
 */
export interface FacetOption {
  label: string;
  value: string;
  count: number;
  isRefined?: boolean;
}

/**
 * TaxonomyFacetBootstrap returns normalized UI-ready facets.
 */
export interface TaxonomyFacetBootstrap {
  skills: FacetOption[];
  industries: FacetOption[];
  jobSources: FacetOption[];
}

/**
 * TaxonomyFilters organizes Algolia facet results into a UI-friendly structure.
 */
export interface TaxonomyFilters extends TaxonomyFacetBootstrap {}

/**
 * FacetBootstrapContext provides the context required for a deterministic facet fetch.
 */
export interface FacetBootstrapContext {
  enterpriseCustomerUuid?: string;
  searchCatalogs?: string[];
  catalogUuidsToCatalogQueryUuids?: Record<string, string>;
  locale?: string;
  shouldUseSecuredAlgoliaApiKey?: boolean;
}

/**
 * PathwayFilters (UI-facing)
 */
export interface PathwayFilters {
  searchQuery: string;
  statusFilter: CourseStatus | 'all';
  levelFilter: string | 'all';
  sortKey: 'order' | 'title' | 'status' | 'level';
  sortOrder: 'asc' | 'desc';
}
