/**
 * Feature-local types for the AI Pathways prototype.
 */

export interface FacetValue {
  value: string;
  count?: number;
}

export interface FacetReference {
  skills: FacetValue[];
  industries: FacetValue[];
  jobSources: FacetValue[];
  name: FacetValue[];
}

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

export type LearnerLevel = 'beginner' | 'intermediate' | 'advanced';
export type TimeCommitment = 'short' | 'medium' | 'long';

export interface XpertIntent {
  condensedQuery: string;
  roles: string[];
  skillsRequired: string[];
  skillsPreferred: string[];
  industries: string[];
  jobSources: string[];
  learnerLevel: LearnerLevel;
  timeCommitment: TimeCommitment;
  excludeTags: string[];
}

/**
 * CareerOption represents a potential career path matching the user's profile.
 */
export interface CareerOption {
  title: string;
  percentMatch: number;
  skills: string[];
  industries?: string[];
  jobSources?: string[];
}

export interface CareerCardModel {
  id: string;
  title: string;
  description: string;
  skills: string[];
  industries: string[];
  similarJobs: string[];
  jobSources: string[];
  marketData?: {
    medianSalary?: number;
    uniquePostings?: number;
  };
  reasoning?: string;
  raw: TaxonomyResult;
}

export interface CourseCardModel {
  id: string;
  title: string;
  level: string | null;
  skills: string[];
  marketingUrl: string | null;
  imageUrl: string | null;
  shortDescription: string | null;
  order: number;
  status: 'recommended' | 'optional' | 'unavailable';
  raw?: unknown;
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
  /** Condensed, query-safe search phrase (2–5 words) for first Algolia retrieval. */
  condensedQuery: string;

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

export interface TaxonomySkill {
  name: string;
  type_name?: string;
  significance?: number;
  unique_postings?: number;
  external_id?: string;
  description?: string;
  info_url?: string;
}

export interface TaxonomyIndustryDetail {
  name: string;
  skills?: string[];
}

export interface TaxonomyJobPosting {
  job_id?: number;
  median_salary?: number;
  median_posting_duration?: number;
  unique_postings?: number;
  unique_companies?: number;
}

export interface TaxonomyResult {
  id?: string | number;
  objectID?: string;

  // Primary display fields from Algolia taxonomy index
  name: string;
  description?: string;
  external_id?: string;

  // Facetable/filterable raw fields
  industry_names?: string[];
  job_sources?: string[];
  similar_jobs?: string[];
  b2c_opt_in?: boolean;

  // Nested data
  skills?: TaxonomySkill[];
  industries?: TaxonomyIndustryDetail[];
  job_postings?: TaxonomyJobPosting[];

  // Optional debug / explainability fields sometimes returned by Algolia
  _highlightResult?: Record<string, unknown>;
  _snippetResult?: Record<string, unknown>;
  _rankingInfo?: Record<string, unknown>;
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
  'skills.name': { items: FacetOption[] };
  'industry_names': { items: FacetOption[] };
  'job_sources': { items: FacetOption[] };
  'name': { items: FacetOption[] };
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

export interface StageMetrics {
  durationMs: number;
  success: boolean;
  error?: string;
}

/**
 * FacetSnapshotTrace captures the catalog facet retrieval summary for debugging.
 */
export interface FacetSnapshotTrace {
  skillNamesCount: number;
  skillsDotNameCount: number;
  subjectsCount: number;
  levelTypeCount: number;
  partnersNameCount: number;
  sampleSkillNames: string[];
  sampleSubjects: string[];
}

/**
 * RulesFirstMappingTrace captures the outcome of the deterministic taxonomy-to-catalog mapping.
 */
export interface RulesFirstMappingTrace {
  termsConsidered: number;
  exactMatchCount: number;
  aliasMatchCount: number;
  unmatchedCount: number;
  exactMatches: string[];
  aliasMatches: string[];
  unmatched: string[];
}

/**
 * CatalogTranslationTrace captures the final consolidated translation output.
 */
export interface CatalogTranslationTrace {
  query: string;
  queryAlternates: string[];
  strictSkillCount: number;
  boostSkillCount: number;
  subjectHintCount: number;
  droppedSkillCount: number;
  strictSkills: string[];
  boostSkills: string[];
  subjectHints: string[];
  xpertUsed: boolean;
  xpertSystemPrompt?: string;
  xpertRawResponse?: string;
  xpertDurationMs?: number;
  xpertSuccess?: boolean;
}

/**
 * RetrievalLadderAttempt captures a single step in the course retrieval ladder.
 */
export interface RetrievalLadderAttempt {
  step: 1 | 2 | 3 | 4;
  label: string;
  query?: string;
  facetFilters?: unknown;
  optionalFilters?: unknown;
  hitCount: number;
  winner: boolean;
}

/**
 * RetrievalLadderTrace captures all attempts in the course retrieval ladder.
 */
export interface RetrievalLadderTrace {
  attempts: RetrievalLadderAttempt[];
  winnerStep: number | null;
}

/**
 * PromptDebugEntry records the interception outcome for a single Xpert call.
 * Stored in AIPathwaysResponseModel.promptDebug so the DebugConsole can surface
 * what was originally built, what was sent, and what the user decided.
 */
export interface PromptDebugEntry {
  /** Human-readable label matching InterceptContext.label, e.g. "Intent Extraction". */
  label: string;
  /** The prompt bundle as it was built, before any user edits. */
  original: XpertPromptBundle;
  /** The bundle that was actually sent; present only when the decision was `accepted` and the user made edits. */
  edited?: XpertPromptBundle;
  /** The user's interception decision. */
  decision: 'accepted' | 'rejected' | 'cancelled';
  /** ISO-8601 timestamp of when the decision was recorded. */
  timestamp: string;
  /**
   * Validation issues surfaced before the decision was recorded.
   * Includes both errors and warnings.  Absent when validation produced no issues.
   */
  validationWarnings?: Array<{ severity: 'error' | 'warning'; code: string; message: string }>;
}

/**
 * AIPathwaysResponseModel represents the complete staged state of a pathway generation.
 */
export interface AIPathwaysResponseModel {
  requestId: string;
  /**
   * Ordered list of prompt interception outcomes for this request.
   * Each entry corresponds to one Xpert call that passed through the interceptor.
   * Empty when debug / interception mode is disabled.
   */
  promptDebug?: PromptDebugEntry[];
  stages: {
    facetBootstrap: StageMetrics;
    intentExtraction: StageMetrics & {
      systemPrompt: string;
      rawResponse: string;
      parsedResponse: any;
      validationErrors: string[];
      repairPromptUsed: boolean;
    };
    careerRetrieval: StageMetrics & {
      resultCount: number;
    };
    catalogFacetSnapshot?: StageMetrics & {
      trace: FacetSnapshotTrace;
    };
    rulesFirstMapping?: StageMetrics & {
      trace: RulesFirstMappingTrace;
    };
    catalogTranslation?: StageMetrics & {
      trace: CatalogTranslationTrace;
    };
    retrievalLadder?: StageMetrics & {
      trace: RetrievalLadderTrace;
    };
    courseRetrieval: StageMetrics & {
      resultCount: number;
    };
    pathwayEnrichment: StageMetrics & {
      systemPrompt: string;
      rawResponse: string;
    };
  };
}

/**
 * PromptPart represents a single named, labelled segment of a system prompt.
 * Parts are composed into a full prompt via XpertPromptBundle.
 */
export type PromptPartLabel = 'base' | 'facetContext' | 'schema' | 'repair';

export interface PromptPart {
  label: PromptPartLabel;
  content: string;
  editable: boolean;
  required: boolean;
}

/**
 * XpertPromptBundle is the structured representation of a system prompt.
 * `combined` is the exact string that must be sent to Xpert — it is always
 * derived from `parts` and must never diverge from legacy behaviour.
 */
export interface XpertPromptBundle {
  id: string;
  stage: 'intentExtraction' | 'catalogTranslation';
  parts: PromptPart[];
  combined: string;
}

export interface XpertMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface XpertServiceConfig {
  clientId: string;
  baseUrl: string;
}

export * from './catalogFacet';
export * from './catalogTranslation';
export * from './translationContracts';
