/**
 * Feature-local types for the AI Pathways feature.
 * This file serves as the central hub for types that bridge the UI,
 * AI services (Xpert), and retrieval layers (Algolia).
 */

import {CatalogSkillMatch} from "./translationContracts";

/**
 * Represents a single facet value from a search index.
 */
export interface FacetValue {
  /** The human-readable or machine-name value. */
  value: string;
  /** Optional count of documents matching this facet value. */
  count?: number;
}

/**
 * References to taxonomical facets used for career and course matching.
 * Primarily used in the intent extraction and translation pipeline.
 */
export interface FacetReference {
  skills: FacetValue[];
  industries: FacetValue[];
  jobSources: FacetValue[];
  name: FacetValue[];
}

/**
 * Defines the lifecycle of a course within a learning pathway.
 */
export type CourseStatus = 'completed' | 'in_progress' | 'not_started';

/**
 * Represents a single educational item in a personalized pathway.
 * This is the final UI-ready shape after enrichment and mapping.
 */
export interface PathwayCourse {
  /** Unique identifier for the course. */
  id?: string;
  /** Primary title of the course. */
  title: string;
  /** Difficulty level (e.g., 'Beginner', 'Intermediate'). */
  level: string;
  /** List of key skills covered by this course. */
  skills: string[];
  /** AI-generated reasoning for why this course was included. */
  reasoning?: string;
  /** Current completion status for the learner. */
  status: CourseStatus;
  /** Sort order within the pathway. */
  order: number;
  /** Brief summary of the course content. */
  shortDescription?: string;
  /** URL to the course thumbnail or banner image. */
  imageUrl?: string;
  /** Direct link to the course detail page. */
  marketingUrl?: string;
}

/**
 * The top-level collection of recommended courses forming a pathway.
 */
export interface LearningPathway {
  /** Ordered list of courses in the pathway. */
  courses: PathwayCourse[];
}

/**
 * Standard learner difficulty tiers.
 */
export type LearnerLevel = 'beginner' | 'intermediate' | 'advanced';

/**
 * Preferred intensity of the learning journey.
 */
export type TimeCommitment = 'short' | 'medium' | 'long';

/**
 * Extracted search intent derived from the learner's natural language input.
 * This is the structured output of the Intent Extraction stage.
 */
export interface XpertIntent {
  /** A concise, optimized query string for search. */
  condensedQuery: string;
  /** List of target job roles or titles. */
  roles: string[];
  /** Core skills required to achieve the goal. */
  skillsRequired: string[];
  /** Complementary skills that are nice to have. */
  skillsPreferred: string[];
  /** Target industries. */
  industries: string[];
  /** Geographic or platform job sources. */
  jobSources: string[];
  /** Normalized learner level. */
  learnerLevel: LearnerLevel;
  /** Normalized time commitment. */
  timeCommitment: TimeCommitment;
  /** List of tags or terms to explicitly exclude from results. */
  excludeTags: string[];
  /** Discovery data from Xpert RAG retrieval. */
  discovery?: any;
  /** Whether discovery RAG was used during the request. */
  wasDiscoveryUsed?: boolean;
}

/**
 * Represents a potential career path matching the user's profile.
 * Returned from the Career Retrieval stage (taxonomy search).
 */
export interface CareerOption {
  /** Professional title. */
  title: string;
  /** Similarity score (0-100) relative to the learner's profile. */
  percentMatch: number;
  /** Key skills associated with this career. */
  skills: string[];
  /** Industries where this career is prevalent. */
  industries?: string[];
  /** Sources where this job is frequently found. */
  jobSources?: string[];
}

/**
 * UI model for displaying a career opportunity card.
 * Derived from a TaxonomyResult.
 */
export interface CareerCardModel {
  /** Unique ID from the taxonomy index. */
  id: string;
  /** Professional title. */
  title: string;
  /** Summary of the role and its relevance. */
  description: string;
  /** Top skills for this role. */
  skills: string[];
  /** Primary industries. */
  industries: string[];
  /** Related job titles. */
  similarJobs: string[];
  /** Data sources for this job entry. */
  jobSources: string[];
  /** Labor market insights (optional). */
  marketData?: {
    medianSalary?: number;
    uniquePostings?: number;
  };
  /** Explanation of why this career matches the user's input. */
  reasoning?: string;
  /** The original raw taxonomy record. */
  raw: TaxonomyResult;
  /** Percentage match score between user input and career data. */
  percentMatch: number;
}

/**
 * UI model for displaying a course card within the results list.
 */
export interface CourseCardModel {
  /** Unique identifier. */
  id: string;
  /** Course name. */
  title: string;
  /** Difficulty tier. */
  level: string | null;
  /** List of primary skills taught. */
  skills: string[];
  /** Direct link to course. */
  marketingUrl: string | null;
  /** Course thumbnail image. */
  imageUrl: string | null;
  /** Short summary of course content. */
  shortDescription: string | null;
  /** Relative rank or order in the recommendation list. */
  order: number;
  /** Recommendation status within the current context. */
  status: 'recommended' | 'optional' | 'unavailable';
  /** Original search hit data. */
  raw?: unknown;
}

/**
 * Summarizes the user's input and matched career opportunities.
 * This is the intermediate state shown to the user before pathway generation.
 */
export interface LearnerProfile {
  /** Learner's full name or preferred name. */
  name?: string;
  /** AI-generated summary of the learner's situation. */
  overview: string;
  /** Primary professional objective. */
  careerGoal: string;
  /** Targeted sector or field. */
  targetIndustry: string;
  /** Relevant previous experience or education. */
  background: string;
  /** Internal or external drivers for learning. */
  motivation: string;
  /** Preferred learning modality (e.g., async, live). */
  learningStyle: string;
  /** Weekly time availability. */
  timeAvailable: string;
  /** Preference for earned credentials. */
  certificate: string;
  /** List of career paths that align with this profile. */
  careerMatches: CareerOption[];
}

/**
 * Raw intake form responses captured from the UI.
 * Used as input for the Preprocessing and Intent Extraction stages.
 */
export interface CreateLearnerProfileArgs {
  /** "What brings you here today?" response. */
  bringsYouHereRes: string;
  /** "What is your career goal?" response. */
  careerGoalRes: string;
  /** Learning style and preference response. */
  learningPrefRes: string;
  /** Previous experience summary. */
  backgroundRes: string;
  /** Target industry response. */
  industryRes: string;
  /** Weekly hour commitment response. */
  timeAvailableRes: string;
  /** Certificate importance response. */
  certificateRes: string;
}

/**
 * Detail for a specific skill found in the taxonomy index.
 */
export interface TaxonomySkill {
  name: string;
  type_name?: string;
  significance?: number;
  unique_postings?: number;
  external_id?: string;
  description?: string;
  info_url?: string;
}

/**
 * Industry-specific details from the taxonomy index.
 */
export interface TaxonomyIndustryDetail {
  name: string;
  skills?: string[];
}

/**
 * Labor market data for a job role in the taxonomy.
 */
export interface TaxonomyJobPosting {
  job_id?: number;
  median_salary?: number;
  median_posting_duration?: number;
  unique_postings?: number;
  unique_companies?: number;
}

/**
 * Raw record from the Algolia taxonomy index.
 */
export interface TaxonomyResult {
  /** Unique ID. */
  id?: string | number;
  /** Algolia-specific unique ID. */
  objectID?: string;

  /** Primary professional title. */
  name: string;
  /** General role description. */
  description?: string;
  /** Cross-reference identifier. */
  external_id?: string;

  /** List of associated industries. */
  industry_names?: string[];
  /** Sources where this job is listed. */
  job_sources?: string[];
  /** Related professional titles. */
  similar_jobs?: string[];
  /** Whether this role is available in consumer catalogs. */
  b2c_opt_in?: boolean;

  /** Associated skills. */
  skills?: TaxonomySkill[];
  /** Detailed industry mappings. */
  industries?: TaxonomyIndustryDetail[];
  /** Historical job posting data. */
  job_postings?: TaxonomyJobPosting[];

  /** Algolia highlighting metadata. */
  _highlightResult?: Record<string, unknown>;
  /** Algolia snippet metadata. */
  _snippetResult?: Record<string, unknown>;
  /** Algolia ranking metadata. */
  _rankingInfo?: Record<string, unknown>;
}

/**
 * A single filterable option derived from an Algolia facet.
 */
export interface FacetOption {
  /** Human-readable name. */
  label: string;
  /** Machine-readable value. */
  value: string;
  /** Frequency count in the current result set. */
  count: number;
  /** Whether this facet is currently selected. */
  isRefined?: boolean;
}

/**
 * Normalized UI-ready facets retrieved from the taxonomy index.
 */
export interface TaxonomyFacetBootstrap {
  'skills.name': { items: FacetOption[] };
  'industry_names': { items: FacetOption[] };
  'job_sources': { items: FacetOption[] };
  'name': { items: FacetOption[] };
}

/**
 * Filter state for the taxonomy/career search.
 */
export interface TaxonomyFilters extends TaxonomyFacetBootstrap {}

/**
 * Context required for fetching deterministic facets from Algolia.
 */
export interface FacetBootstrapContext {
  /** Scopes the search to a specific enterprise customer. */
  enterpriseCustomerUuid?: string;
  /** List of catalogs to include in the search. */
  searchCatalogs?: string[];
  /** Mapping of catalog IDs to their search-specific query IDs. */
  catalogUuidsToCatalogQueryUuids?: Record<string, string>;
  /** User's preferred locale. */
  locale?: string;
  /** Whether to use a restricted API key for security. */
  shouldUseSecuredAlgoliaApiKey?: boolean;
}

/**
 * Filter and sort state for the Learning Pathway results view.
 */
export interface PathwayFilters {
  /** Text-based filter for course titles. */
  searchQuery: string;
  /** Lifecycle status filter. */
  statusFilter: CourseStatus | 'all';
  /** Difficulty level filter. */
  levelFilter: string | 'all';
  /** Primary sort dimension. */
  sortKey: 'order' | 'title' | 'status' | 'level';
  /** Sort direction. */
  sortOrder: 'asc' | 'desc';
}

/**
 * Performance and success metrics for a single pipeline stage.
 */
export interface StageMetrics {
  /** Time taken in milliseconds. */
  durationMs: number;
  /** Whether the stage finished successfully. */
  success: boolean;
  /** Error message if success is false. */
  error?: string;
}

/**
 * Summary of catalog facets used during the translation stage.
 * Used for debugging and tracing translation decisions.
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
 * Traces the outcome of deterministic mapping from taxonomy to catalog facets.
 * Identifies which terms matched exactly or via aliases.
 */
export interface RulesFirstMappingTrace {
  /** Total number of terms processed. */
  termsConsidered: number;
  /** Number of successful exact matches. */
  exactMatchCount: number;
  /** Number of successful alias matches. */
  aliasMatchCount: number;
  /** Number of terms that failed to map deterministically. */
  unmatchedCount: number;
  /** List of exact matches found. */
  exactMatches: string[];
  /** List of alias matches found. */
  aliasMatches: string[];
  /** List of terms that remain unmatched. */
  unmatched: string[];
}

/**
 * Traces the final output of the catalog translation stage.
 * Includes Xpert-specific metadata if AI was used for mapping.
 */
export interface CatalogTranslationTrace {
  /** The final generated search query. */
  query: string;
  /** Fallback or broader query variations. */
  queryAlternates: string[];
  /** Count of required skills. */
  strictSkillCount: number;
  /** Count of preferred/boosted skills. */
  boostSkillCount: number;
  /** Count of category hints. */
  subjectHintCount: number;
  /** Count of skills that could not be mapped and were dropped. */
  droppedSkillCount: number;
  strictSkills: string[];
  boostSkills: string[];
  subjectHints: string[];
  /** Whether the AI (Xpert) was involved in this translation. */
  xpertUsed: boolean;
  /** The full system prompt sent to Xpert. */
  xpertSystemPrompt?: string;
  /** The raw, unparsed response from Xpert. */
  xpertRawResponse?: string;
  /** Duration of the Xpert call in milliseconds. */
  xpertDurationMs?: number;
  /** Whether the Xpert call was successful. */
  xpertSuccess?: boolean;
  /** Discovery data from Xpert RAG retrieval. */
  xpertDiscovery?: any;
  /** Whether discovery RAG was used during the request. */
  xpertWasDiscoveryUsed?: boolean;
  strictSkillFilters?: CatalogSkillMatch[];
  boostSkillFilters?: CatalogSkillMatch[];
}

/**
 * Captures a single search attempt in the course retrieval ladder.
 * The "ladder" tries progressively broader searches until hits are found.
 */
export interface RetrievalLadderAttempt {
  /** The step number (1 is most specific, 4 is broadest). */
  step: 1 | 2 | 3 | 4;
  /** Human-readable label for this attempt step. */
  label: string;
  /** The exact query used. */
  query?: string;
  /** Applied facet filters. */
  facetFilters?: unknown;
  /** Applied optional (boosting) filters. */
  optionalFilters?: unknown;
  /** Number of courses found. */
  hitCount: number;
  /** Whether this attempt was selected as the "winner" for the pathway. */
  winner: boolean;
  /** The actual course hits returned for this step. */
  hits?: CourseRetrievalHit[];
}

/**
 * Traces all attempts made during the retrieval ladder phase.
 */
export interface RetrievalLadderTrace {
  /** History of search attempts. */
  attempts: RetrievalLadderAttempt[];
  /** The step number that successfully provided results. */
  winnerStep: number | null;
}

/**
 * Content partner or provider information.
 */
export interface Partner {
  name?: string;
  logo_image_url?: string;
}

/**
 * User's access rights or pricing for a specific course.
 */
export interface Entitlement {
  mode?: string;
  price?: string;
  currency?: string;
  sku?: string;
  expires?: string | null;
}

/**
 * Metadata for a specific instance/run of a course.
 */
export interface AdvertisedCourseRun {
  key?: string;
  pacing_type?: string;
  availability?: string;
  start?: string | null;
  end?: string | null;
  min_effort?: number | null;
  max_effort?: number | null;
  weeks_to_complete?: number | null;
  content_price?: number | null;
  is_active?: boolean;
}

/**
 * Raw course record retrieved from the Algolia catalog index.
 */
export interface CourseRetrievalHit {
  /** Unique Algolia ID. */
  objectID: string;
  /** Internal course key. */
  key?: string;
  /** System UUID. */
  uuid?: string;
  /** Course name. */
  title: string;
  /** Brief summary of content. */
  short_description?: string;
  /** Link to course detail. */
  marketing_url?: string;
  /** Small thumbnail image. */
  card_image_url?: string;
  /** Large banner image. */
  image_url?: string;
  /** Unprocessed image URL. */
  original_image_url?: string;
  /** List of availability modes (e.g., 'Always available'). */
  availability?: string[];
  /** Difficulty level. */
  level_type?: string;
  /** Primary language of instruction. */
  language?: string;
  /** List of primary skills taught. */
  skill_names?: string[];
  /** High-level categories. */
  subjects?: string[];
  /** Providing institutions or companies. */
  partners?: Partner[];
  /** Programs this course belongs to. */
  programs?: string[];
  /** Titles of associated programs. */
  program_titles?: string[];
  /** Type of content (e.g., 'course', 'specialization'). */
  content_type?: string;
  /** modality of learning. */
  learning_type?: string;
  learning_type_v2?: string;
  course_type?: string;
  /** User's access entitlements. */
  entitlements?: Entitlement[];
  /** Details on the current/next run. */
  advertised_course_run?: AdvertisedCourseRun;
}

/**
 * Records the interception and outcome for a single Xpert call.
 * This is used for debugging and prompt engineering within the prototype.
 */
export interface PromptDebugEntry {
  /** Human-readable label (e.g. "Intent Extraction"). */
  label: string;
  /** The prompt bundle as it was originally built. */
  original: XpertPromptBundle;
  /** The bundle that was actually sent (after user edits). */
  edited?: XpertPromptBundle;
  /** The user's interception decision. */
  decision: 'accepted' | 'rejected' | 'cancelled';
  /** ISO-8601 timestamp of the decision. */
  timestamp: string;
  /** Validation issues produced by the prompt validation service. */
  validationWarnings?: Array<{ severity: 'error' | 'warning'; code: string; message: string }>;
}

/**
 * Represents the complete state and trace of a pathway generation request.
 * This model is the primary data structure for the AI Pathways debug flow.
 */
export interface AIPathwaysResponseModel {
  /** Unique ID for the generation session. */
  requestId: string;
  /** Tags used in Xpert requests for RAG control. */
  tags?: string[];
  /** Discovery data from Xpert RAG retrieval. */
  discovery?: any;
  /** Whether discovery RAG was used during the request. */
  wasDiscoveryUsed?: boolean;
  /** Ordered list of prompt interception events. */
  promptDebug?: PromptDebugEntry[];
  /** Metrics and data for each stage of the generation pipeline. */
  stages: {
    /** Initial loading of taxonomy facets. */
    facetBootstrap: StageMetrics;
    /** Conversion of natural language input to structured intent. */
    intentExtraction: StageMetrics & {
      systemPrompt: string;
      rawResponse: string;
      parsedResponse: any;
      validationErrors: string[];
      repairPromptUsed: boolean;
      discovery?: any;
      wasDiscoveryUsed?: boolean;
    };
    /** Search for matching careers in the taxonomy index. */
    careerRetrieval: StageMetrics & {
      resultCount: number;
    };
    /** Capturing current catalog facets for translation. */
    catalogFacetSnapshot?: StageMetrics & {
      trace: FacetSnapshotTrace;
    };
    /** Initial mapping from taxonomy to catalog terms. */
    rulesFirstMapping?: StageMetrics & {
      trace: RulesFirstMappingTrace;
    };
    /** AI-driven translation of remaining taxonomy terms. */
    catalogTranslation?: StageMetrics & {
      trace: CatalogTranslationTrace;
      discovery?: any;
      wasDiscoveryUsed?: boolean;
    };
    /** Progressive search logic to find relevant courses. */
    retrievalLadder?: StageMetrics & {
      trace: RetrievalLadderTrace;
    };
    /** Execution of the final course searches. */
    courseRetrieval: StageMetrics & {
      resultCount: number;
      hits?: CourseRetrievalHit[];
    };
    /** Final assembly and enrichment of the course pathway. */
    pathwayEnrichment: StageMetrics & {
      systemPrompt: string;
      rawResponse: string;
      discovery?: any;
      wasDiscoveryUsed?: boolean;
    };
  };
}

/**
 * Represents a single named segment of an AI system prompt.
 */
export type PromptPartLabel = 'base' | 'facetContext' | 'schema' | 'repair' | 'json_instruction';

/**
 * A component part of a structured prompt.
 */
export interface PromptPart {
  /** Identifier for the part's role. */
  label: PromptPartLabel;
  /** The actual text content. */
  content: string;
  /** Whether the user is allowed to edit this part in the debug console. */
  editable: boolean;
  /** Whether this part must be present for a valid prompt. */
  required: boolean;
}

/**
 * A structured bundle representing a complete system prompt.
 * Ensures consistent composition of multiple prompt segments.
 */
export interface XpertPromptBundle {
  /** Unique identifier for the bundle instance. */
  id: string;
  /** The pipeline stage this prompt belongs to. */
  stage: 'intentExtraction' | 'catalogTranslation' | 'pathwayEnrichment';
  /** Individual parts composing the prompt. */
  parts: PromptPart[];
  /** The final flattened string sent to the AI. */
  combined: string;
  /** Optional RAG control tags for the request. */
  tags?: string[];
}

/**
 * A single message in a conversation with Xpert.
 */
export interface XpertMessage {
  /** The sender's role. */
  role: 'user' | 'assistant' | 'tool';
  /** The message text. */
  content: string;
}

/**
 * Request shape for Xpert Platform message requests.
 */
export interface XpertMessageRequest {
  messages: XpertMessage[];
  systemMessage?: string;
  conversationId?: string;
  stream?: boolean;
  tags?: string[];
}

export interface XpertMessageResponse {
  content: string;
  role: string;
  discovery?: any;
}

/**
 * Configuration for the Xpert backend service.
 */
export interface XpertServiceConfig {
  /** Client identifier for API authentication. */
  clientId: string;
  /** Root URL for the Xpert API. */
  baseUrl: string;
}

export * from './catalogFacet';
export * from './catalogTranslation';
export * from './translationContracts';
