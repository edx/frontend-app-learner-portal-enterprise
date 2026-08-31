// eslint-disable-next-line import/no-extraneous-dependencies
import axios from 'axios';
import { getConfig } from '@edx/frontend-platform/config';
import type { LearnerIntent } from '../state';
import type { CareerSearchIntent, CareerSearchLearnerLevel, CareerSearchTimeCommitment } from '../types';

/**
 * Structured Algolia-skills fallback signal, selected whenever no trustworthy literal
 * `_id` can be returned. `Required<CareerSearchIntent>` rather than a new type: this
 * shape is field-for-field identical to `CareerSearchIntent` (`../types/careerRetrieval`),
 * and every field is always populated here (never omitted the way the career flow's
 * optional fields can be) — reusing it, rather than inventing a parallel type, means this
 * fallback slots directly into `CourseSearchIntentSignal`/`courseRetrievalService` inputs
 * with zero translation.
 */
export type LearnerSkillFallback = Required<CareerSearchIntent>;

/**
 * Fail-closed, two-outcome result of direct-mode course-key retrieval. Exactly one
 * branch is ever populated — never a mix, never an empty `discovery_course_keys` list,
 * never a model-asserted "trust me" boolean. `discovery_course_keys` is an ordered
 * candidate pool of exact, verbatim top-level `_id` values copied from retrieved
 * Discovery RAG documents; `algolia_skills_fallback` is selected whenever no such
 * trustworthy key can be returned, and feeds Algolia course retrieval directly — never
 * career retrieval, never Recommendation Feedback.
 */
export type DirectCourseRetrievalResult =
  | { retrievalStrategy: 'discovery_course_keys'; courseKeys: string[]; fallback: null }
  | { retrievalStrategy: 'algolia_skills_fallback'; courseKeys: []; fallback: LearnerSkillFallback };

export interface DirectCourseKeyRetrievalOptions {
  /** Overrides `DIRECT_COURSE_CANDIDATE_LIMIT` for callers that need a smaller pool. */
  candidateLimit?: number;
  /** Optional caller-provided Xpert conversation id; omitted when not supplied. */
  conversationId?: string;
}

/**
 * Maximum candidate pool size for direct-mode course-key retrieval. Deliberately
 * distinct from the career flow's five-course Pathway display limit — this is the
 * upstream candidate pool Enterprise Catalog inclusion and Algolia metadata retrieval
 * (later phases) will narrow down, not what the learner ultimately sees.
 */
export const DIRECT_COURSE_CANDIDATE_LIMIT = 20;

/**
 * Discovery RAG tags scoping Xpert's document retrieval, matching the tags already
 * proven (both in the recovered historical POC and the live `enterprise-access`
 * `XPERT_LEARNER_PATHWAYS_RAG_TAGS` setting) to select the Discovery course/skill
 * document set. Serialized unconditionally — unlike the historical POC's transport,
 * direct-mode retrieval always wants RAG on.
 */
const DIRECT_COURSE_RAG_TAGS = ['discovery', 'edx-available-course'];

/**
 * Stable, typed failure for this service. Covers configuration failures (thrown before
 * any network call) and malformed-response failures (thrown instead of silently
 * returning an empty/partial result, so a broken Xpert/transport contract or a
 * malformed model response is never mistaken for a legitimate outcome).
 */
export class DirectCourseKeyRetrievalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DirectCourseKeyRetrievalError';
  }
}

const CONDENSED_QUERY_BANNED_WORDS = [
  'skills', 'career', 'training', 'course', 'pathway', 'learning', 'learn', 'job', 'jobs',
];

/**
 * Base persona/instructions prompt (before the appended output schema — see
 * `buildSystemPrompt`). Fail-closed retrieval router: exactly one of two outcomes is
 * ever valid, and the model is given no legitimate way to justify a fabricated course
 * key. Reflects the REAL Discovery RAG search result shape (an OpenSearch hit:
 * top-level `_id` + `_source` fields) — verified directly against
 * `xpert-api-services`'s RAG-injection code, not assumed.
 *
 * No concrete example `_id`/URL/slug/UUID appears anywhere below: a real-looking
 * example can be copied back by the model as a fabricated key, so the document shape is
 * shown with a descriptive placeholder instead of a literal value.
 */
const buildBaseSystemPrompt = (candidateLimit: number): string => `You are a fail-closed course-key retrieval router for Discovery RAG.

INPUT

You will receive the learner's intake answers as a JSON object in the user message, with exactly these fields: careerGoal, targetIndustry, background, motivation.

Your job: decide between exactly two outcomes — grounded Discovery course keys, or a structured Algolia skills fallback — and return ONLY raw JSON matching the schema below. No markdown. No commentary. No code fence.

DOCUMENT SHAPE

Each Discovery RAG result, when present, is a search document shaped like this:

{
  "_id": "<the literal, opaque document id string — copy exactly, character for character>",
  "_score": 1,
  "_source": {
    "tags": ["discovery", "edx-available-course"],
    "content": "<course><title>...</title><description>...</description><partner>...</partner><duration>...</duration><type>...</type><url>...</url><levelType>...</levelType><instructors>...</instructors></course>",
    "skillNames": ["..."],
    "levelType": "Introductory" | "Intermediate" | "Advanced",
    "imageUrl": "...",
    "enrollmentCount": 0
  }
}

PRIMARY OUTCOME: DISCOVERY COURSE KEYS

Choose "discovery_course_keys" only when you can return one or more course keys that are each the document's literal, verbatim top-level "_id" field, copied exactly, character for character, from a retrieved document you actually saw.

Never derive, guess, reconstruct, or invent a course key from any of the following — none of them is a valid source, no matter how plausible the result looks:
- the course's title or description
- anything inside _source.content's <url> tag, or any other URL or path
- any slug
- _source.imageUrl
- any UUID
- partner or instructor text
- _source.skillNames
- _index, _score, _source.tags, enrollmentCount, checksum, or any other search/display metadata
- prior knowledge of what a plausible course-key format looks like
- any identifier shown as an example anywhere in these instructions or in the output schema

If a candidate is not backed by a literal "_id" you actually retrieved, do not include it. Returning fewer, well-grounded course keys — down to a single one — is always correct; padding the list to reach ${candidateLimit} with a fabricated or weakly-grounded candidate is never correct.

Use these _source fields only to judge relevance, never as a key source: content's <title>, <description>, <levelType> (mirrored at _source.levelType, compare against the learner's stated background), <duration>, <partner>, <instructors>; _source.skillNames (match against the learner's goal, background, and motivation). Order returned course keys by relevance, then by sensible learning progression. Return up to ${candidateLimit} course keys when that many grounded candidates exist — do not artificially cap yourself lower, and do not pad to reach it.

FALLBACK OUTCOME: ALGOLIA SKILLS

Choose "algolia_skills_fallback" whenever you cannot return at least one course key that satisfies every rule above — Discovery RAG returned nothing usable, returned only irrelevant documents, or you are uncertain whether a candidate's "_id" is genuinely one you retrieved. In this outcome, "course_keys" must be an empty array, and "fallback" must be a complete object describing the learner's skills so Algolia course search can run directly against their catalog. Derive it only from the learner's four intake fields (careerGoal, targetIndustry, background, motivation) — never from Discovery RAG documents, since by definition none were usable:

- "skills_required": 1 to 3 broad, foundational skill anchors clearly implied by careerGoal/background — never invented specifics not implied by the input.
- "skills_preferred": 0 to 6 secondary skills that refine the search, still grounded in the input; an empty array is correct when none are clearly implied.
- "condensed_algolia_query": 2 to 5 words built only from skills_required, describing what to search for — never a generic word like "skills", "career", "training", "course", "pathway", "learning", "learn", "job", or "jobs".
- "roles": explicit job/role titles only if the learner stated one; otherwise an empty array — never inferred from an industry alone.
- "industries": explicit industries only if the learner stated one; otherwise an empty array.
- "job_sources": normally an empty array.
- "exclude_tags": positive-labeled tags to avoid, only if clearly implied; otherwise an empty array.
- "learner_level": "introductory" by default, or when background suggests a career or domain change; "intermediate" or "advanced" only when background clearly supports it.
- "time_commitment": "medium" by default; "short" or "long" only when clearly implied by the input.

This fallback is a retrieval refinement for Algolia course search only — never treat it as a career-matching or job-matching request.

BRANCH RULES

Exactly one outcome is valid per response: either "discovery_course_keys" with one or more grounded keys and "fallback": null, or "algolia_skills_fallback" with an empty "course_keys" and a complete "fallback" object. Never mix outcomes, never return an empty "discovery_course_keys" list, and never include course keys alongside a fallback. When uncertain which outcome applies, choose the fallback — a wrong grounded key is worse than a fallback.`;

/**
 * JSON-Schema-shaped output contract, kept as a separate structured object rather than
 * an inline example embedded in prose — mirrors `enterprise-access`'s
 * `BaseSystemPrompt.output_schema` field, appended independently of the base
 * `system_prompt` text (see `apps/prompts/api.py:build_system_prompt`).
 *
 * A flat, discriminator-based shape rather than a `oneOf`/`const` union: Xpert's schema
 * dialect support for those constructs is unverified, so the closest broadly-supported
 * flat schema is used instead, with the two-outcome invariant enforced in the prompt
 * text above AND in `normalizeResponse` below — never silently relaxed back to an
 * ambiguous array+boolean contract.
 */
const buildOutputSchema = (candidateLimit: number) => ({
  type: 'object',
  additionalProperties: false,
  properties: {
    retrieval_strategy: {
      type: 'string',
      enum: ['discovery_course_keys', 'algolia_skills_fallback'],
      description: 'Discriminator. "discovery_course_keys" when course_keys is populated with grounded keys and fallback is null; "algolia_skills_fallback" when course_keys is empty and fallback is a complete skills object.',
    },
    course_keys: {
      type: 'array',
      items: {
        type: 'string',
        minLength: 1,
        description: 'An opaque, literal top-level "_id" copied exactly, character for character, from a retrieved Discovery RAG document. Never derived from any other field.',
      },
      minItems: 1,
      maxItems: candidateLimit,
      uniqueItems: true,
      description: `Populated (1 to ${candidateLimit} items) only when retrieval_strategy is "discovery_course_keys". Must be an empty array when retrieval_strategy is "algolia_skills_fallback".`,
    },
    fallback: {
      type: ['object', 'null'],
      additionalProperties: false,
      description: 'null when retrieval_strategy is "discovery_course_keys". A complete object matching every property below when retrieval_strategy is "algolia_skills_fallback".',
      properties: {
        skills_required: {
          type: 'array',
          items: { type: 'string', minLength: 1 },
          minItems: 1,
          maxItems: 3,
          uniqueItems: true,
          description: 'Broad, foundational skill anchors clearly implied by the learner\'s careerGoal/background.',
        },
        skills_preferred: {
          type: 'array',
          items: { type: 'string', minLength: 1 },
          maxItems: 6,
          uniqueItems: true,
          description: 'Secondary, grounded skills that refine the search. Empty array when none are clearly implied.',
        },
        condensed_algolia_query: {
          type: 'string',
          minLength: 1,
          maxLength: 100,
          description: 'A 2 to 5 word Algolia query built only from skills_required. Must not contain generic words like skills, career, training, course, pathway, learning, learn, job, or jobs.',
        },
        roles: {
          type: 'array',
          items: { type: 'string', minLength: 1 },
          uniqueItems: true,
          description: 'Explicit job/role titles stated by the learner. Empty array when none were stated.',
        },
        industries: {
          type: 'array',
          items: { type: 'string', minLength: 1 },
          uniqueItems: true,
          description: 'Explicit industries stated by the learner. Empty array when none were stated.',
        },
        job_sources: {
          type: 'array',
          items: { type: 'string', minLength: 1 },
          uniqueItems: true,
          description: 'Normally an empty array.',
        },
        learner_level: {
          type: 'string',
          enum: ['introductory', 'intermediate', 'advanced'],
          description: 'Defaults to "introductory" when unclear or when background suggests a career/domain change.',
        },
        time_commitment: {
          type: 'string',
          enum: ['short', 'medium', 'long'],
          description: 'Defaults to "medium" unless clearly implied otherwise.',
        },
        exclude_tags: {
          type: 'array',
          items: { type: 'string', minLength: 1 },
          uniqueItems: true,
          description: 'Positive-labeled tags to avoid. Empty array when none are clearly implied.',
        },
      },
      required: [
        'skills_required', 'skills_preferred', 'condensed_algolia_query', 'roles',
        'industries', 'job_sources', 'learner_level', 'time_commitment', 'exclude_tags',
      ],
    },
  },
  required: ['retrieval_strategy', 'course_keys', 'fallback'],
});

/**
 * Recursively sorts object keys (arrays are mapped element-wise, order preserved) so
 * `JSON.stringify` output is deterministic — mirrors Python's
 * `json.dumps(..., sort_keys=True)`, which `enterprise-access` relies on when rendering
 * `output_schema` into the system prompt. `JSON.stringify` has no native recursive
 * key-sort, hence this helper.
 */
const sortKeysDeep = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(sortKeysDeep);
  }
  if (value !== null && typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>).sort().reduce<Record<string, unknown>>(
      (sorted, key) => ({ ...sorted, [key]: sortKeysDeep((value as Record<string, unknown>)[key]) }),
      {},
    );
  }
  return value;
};

const OUTPUT_SCHEMA_SEPARATOR = '\n\nEXPECTED OUTPUT SCHEMA:\n';

/**
 * Assembles the complete system prompt sent to Xpert: the stripped base prompt plus the
 * output schema rendered as pretty, sorted-key JSON under a fixed heading — the exact
 * two-part structure `enterprise-access`'s `build_system_prompt` uses for its own
 * Xpert-backed Learner Pathways prompts (base `system_prompt` + separately-stored
 * `output_schema`, concatenated with the same `"\n\nEXPECTED OUTPUT SCHEMA:\n"` heading).
 */
const buildSystemPrompt = (candidateLimit: number): string => {
  const basePrompt = buildBaseSystemPrompt(candidateLimit).trim();
  const schemaJson = JSON.stringify(sortKeysDeep(buildOutputSchema(candidateLimit)), null, 2);
  return `${basePrompt}${OUTPUT_SCHEMA_SEPARATOR}${schemaJson}`;
};

/** True when `value` is a whitespace-separated word count within `[min, max]`. */
const hasWordCountInRange = (value: string, min: number, max: number): boolean => {
  const words = value.split(/\s+/).filter(Boolean);
  return words.length >= min && words.length <= max;
};

/** Case-insensitive whole-word match — "careers" does not match banned word "career". */
const containsBannedWord = (value: string): boolean => CONDENSED_QUERY_BANNED_WORDS.some(
  (banned) => new RegExp(`\\b${banned}\\b`, 'i').test(value),
);

const isNonEmptyString = (value: unknown): value is string => typeof value === 'string' && value.length > 0;

const hasNoWhitespaceEdges = (value: string): boolean => value === value.trim();

const hasUniqueValues = (values: string[]): boolean => new Set(values).size === values.length;

/** Validates a raw array is `string[]`, non-empty-per-element, whitespace-clean, and duplicate-free. */
const assertStringArray = (
  value: unknown,
  fieldName: string,
): string[] => {
  if (!Array.isArray(value) || !value.every(isNonEmptyString)) {
    throw new DirectCourseKeyRetrievalError(`Xpert response JSON "${fieldName}" was not an array of non-empty strings.`);
  }
  if (!value.every(hasNoWhitespaceEdges)) {
    throw new DirectCourseKeyRetrievalError(`Xpert response JSON "${fieldName}" contained a value with leading or trailing whitespace.`);
  }
  if (!hasUniqueValues(value)) {
    throw new DirectCourseKeyRetrievalError(`Xpert response JSON "${fieldName}" contained duplicate values.`);
  }
  return value;
};

const REQUIRED_FALLBACK_KEYS = [
  'skills_required', 'skills_preferred', 'condensed_algolia_query', 'roles',
  'industries', 'job_sources', 'learner_level', 'time_commitment', 'exclude_tags',
] as const;

const LEARNER_LEVELS: CareerSearchLearnerLevel[] = ['introductory', 'intermediate', 'advanced'];
const TIME_COMMITMENTS: CareerSearchTimeCommitment[] = ['short', 'medium', 'long'];

const validateFallback = (rawFallback: unknown): LearnerSkillFallback => {
  if (rawFallback === null || typeof rawFallback !== 'object' || Array.isArray(rawFallback)) {
    throw new DirectCourseKeyRetrievalError('Xpert response JSON "fallback" was not an object.');
  }
  const fallback = rawFallback as Record<string, unknown>;
  const keys = Object.keys(fallback);
  if (REQUIRED_FALLBACK_KEYS.some((key) => !keys.includes(key)) || keys.length !== REQUIRED_FALLBACK_KEYS.length) {
    throw new DirectCourseKeyRetrievalError('Xpert response JSON "fallback" did not have exactly the required set of keys.');
  }

  const skillsRequired = assertStringArray(fallback.skills_required, 'fallback.skills_required');
  if (skillsRequired.length < 1 || skillsRequired.length > 3) {
    throw new DirectCourseKeyRetrievalError('Xpert response JSON "fallback.skills_required" must have between 1 and 3 items.');
  }

  const skillsPreferred = assertStringArray(fallback.skills_preferred, 'fallback.skills_preferred');
  if (skillsPreferred.length > 6) {
    throw new DirectCourseKeyRetrievalError('Xpert response JSON "fallback.skills_preferred" must have at most 6 items.');
  }

  const roles = assertStringArray(fallback.roles, 'fallback.roles');
  const industries = assertStringArray(fallback.industries, 'fallback.industries');
  const jobSources = assertStringArray(fallback.job_sources, 'fallback.job_sources');
  const excludeTags = assertStringArray(fallback.exclude_tags, 'fallback.exclude_tags');

  const { condensed_algolia_query: condensedAlgoliaQuery } = fallback;
  if (!isNonEmptyString(condensedAlgoliaQuery) || condensedAlgoliaQuery.length > 100) {
    throw new DirectCourseKeyRetrievalError('Xpert response JSON "fallback.condensed_algolia_query" was not a valid non-empty string of at most 100 characters.');
  }
  if (!hasNoWhitespaceEdges(condensedAlgoliaQuery)) {
    throw new DirectCourseKeyRetrievalError('Xpert response JSON "fallback.condensed_algolia_query" had leading or trailing whitespace.');
  }
  if (!hasWordCountInRange(condensedAlgoliaQuery, 2, 5)) {
    throw new DirectCourseKeyRetrievalError('Xpert response JSON "fallback.condensed_algolia_query" must be 2 to 5 words.');
  }
  if (containsBannedWord(condensedAlgoliaQuery)) {
    throw new DirectCourseKeyRetrievalError('Xpert response JSON "fallback.condensed_algolia_query" contained a banned generic word.');
  }

  const { learner_level: learnerLevel, time_commitment: timeCommitment } = fallback;
  if (typeof learnerLevel !== 'string' || !LEARNER_LEVELS.includes(learnerLevel as CareerSearchLearnerLevel)) {
    throw new DirectCourseKeyRetrievalError('Xpert response JSON "fallback.learner_level" was not a valid enum value.');
  }
  if (typeof timeCommitment !== 'string' || !TIME_COMMITMENTS.includes(timeCommitment as CareerSearchTimeCommitment)) {
    throw new DirectCourseKeyRetrievalError('Xpert response JSON "fallback.time_commitment" was not a valid enum value.');
  }

  return {
    skillsRequired,
    skillsPreferred,
    condensedAlgoliaQuery,
    roles,
    industries,
    jobSources,
    learnerLevel: learnerLevel as CareerSearchLearnerLevel,
    timeCommitment: timeCommitment as CareerSearchTimeCommitment,
    excludeTags,
  };
};

const normalizeResponse = (data: unknown, candidateLimit: number): DirectCourseRetrievalResult => {
  if (!Array.isArray(data) || data.length === 0 || typeof data[0] !== 'object' || data[0] === null) {
    throw new DirectCourseKeyRetrievalError('Xpert response envelope was not in the expected shape.');
  }

  const { content } = data[0] as { content?: unknown };
  if (typeof content !== 'string') {
    throw new DirectCourseKeyRetrievalError('Xpert response content was missing or not a string.');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new DirectCourseKeyRetrievalError('Xpert response content was not valid JSON.');
  }

  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new DirectCourseKeyRetrievalError('Xpert response JSON was not an object.');
  }

  const rootKeys = Object.keys(parsed as Record<string, unknown>);
  const expectedRootKeys = ['retrieval_strategy', 'course_keys', 'fallback'];
  if (rootKeys.some((key) => !expectedRootKeys.includes(key)) || rootKeys.length !== expectedRootKeys.length) {
    throw new DirectCourseKeyRetrievalError('Xpert response JSON did not have exactly the required set of top-level keys.');
  }

  const {
    retrieval_strategy: retrievalStrategy,
    course_keys: courseKeys,
    fallback: rawFallback,
  } = parsed as { retrieval_strategy?: unknown; course_keys?: unknown; fallback?: unknown };

  if (retrievalStrategy === 'discovery_course_keys') {
    if (rawFallback !== null) {
      throw new DirectCourseKeyRetrievalError('Xpert response JSON "fallback" must be null when retrieval_strategy is "discovery_course_keys".');
    }
    // No independent, trusted source-ID set is available to cross-check against today:
    // the Xpert RAG-injected prompt text and the /v1/message response envelope both
    // omit document `_id`s (verified directly against xpert-api-services). Only the
    // prompt's strict instructions guard against a fabricated key here — see the
    // service's docblock and this feature's completion report for the full caveat.
    const validatedKeys = assertStringArray(courseKeys, 'course_keys');
    if (validatedKeys.length < 1 || validatedKeys.length > candidateLimit) {
      throw new DirectCourseKeyRetrievalError(`Xpert response JSON "course_keys" must have between 1 and ${candidateLimit} items.`);
    }
    return { retrievalStrategy: 'discovery_course_keys', courseKeys: validatedKeys, fallback: null };
  }

  if (retrievalStrategy === 'algolia_skills_fallback') {
    if (!Array.isArray(courseKeys) || courseKeys.length !== 0) {
      throw new DirectCourseKeyRetrievalError('Xpert response JSON "course_keys" must be an empty array when retrieval_strategy is "algolia_skills_fallback".');
    }
    const fallback = validateFallback(rawFallback);
    return {
      retrievalStrategy: 'algolia_skills_fallback', courseKeys: [], fallback,
    };
  }

  throw new DirectCourseKeyRetrievalError('Xpert response JSON "retrieval_strategy" was missing or not a recognized value.');
};

/**
 * Frontend-direct Xpert + Discovery RAG course-key retrieval. Fail-closed: a grounded
 * course key is only ever accepted when it is a verbatim, whitespace-clean, duplicate-free
 * Discovery document `_id`; anything else collapses into the structured Algolia skills
 * fallback rather than being repaired, trimmed, or silently accepted. See
 * `normalizeResponse` for the full validation contract, and this feature's completion
 * report for the confirmed current limitation that `_id` is not visible to the model or
 * the response envelope against the live Xpert backend.
 */
export const directCourseKeyRetrievalService = {
  /**
   * Resolves either a grounded candidate pool of course keys or a structured skills
   * fallback for the given canonical learner intent.
   *
   * @throws {DirectCourseKeyRetrievalError} When required Xpert configuration is
   *   missing, or when the Xpert response envelope/JSON/shape is malformed or violates
   *   the two-outcome contract. Never returns a partial or mixed result to mask a
   *   malformed response.
   */
  async retrieveCourseKeys(
    learnerIntent: LearnerIntent,
    options: DirectCourseKeyRetrievalOptions = {},
  ): Promise<DirectCourseRetrievalResult> {
    const candidateLimit = options.candidateLimit ?? DIRECT_COURSE_CANDIDATE_LIMIT;
    const { XPERT_API_BASE_URL: baseUrl, XPERT_AI_CLIENT_ID: clientId } = getConfig();
    if (!baseUrl || !clientId) {
      throw new DirectCourseKeyRetrievalError(
        'Direct course-key retrieval is not configured: XPERT_API_BASE_URL and XPERT_AI_CLIENT_ID must both be set.',
      );
    }

    const payload = {
      client_id: clientId,
      messages: [{ role: 'user', content: JSON.stringify(learnerIntent) }],
      system_message: buildSystemPrompt(candidateLimit),
      conversation_id: options.conversationId,
      stream: false,
      tags: DIRECT_COURSE_RAG_TAGS,
    };

    // Unwrapped: a network/HTTP rejection here propagates untouched to the caller —
    // no fallback, no retry, no repair round-trip.
    const response = await axios.post(`${baseUrl}/v1/message`, payload);

    return normalizeResponse(response.data, candidateLimit);
  },
};
