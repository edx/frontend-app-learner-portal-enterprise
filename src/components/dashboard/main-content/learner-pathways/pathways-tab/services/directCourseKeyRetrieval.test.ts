import axios from 'axios';
import { getConfig } from '@edx/frontend-platform/config';
import {
  directCourseKeyRetrievalService,
  DirectCourseKeyRetrievalError,
  DIRECT_COURSE_CANDIDATE_LIMIT,
} from './directCourseKeyRetrieval';
import type { LearnerIntent } from '../state';

jest.mock('axios');
jest.mock('@edx/frontend-platform/config', () => ({ getConfig: jest.fn() }));

const mockedAxios = axios as jest.Mocked<typeof axios>;
const mockedGetConfig = getConfig as jest.Mock;

const stubLearnerIntent: LearnerIntent = {
  careerGoal: 'Data Analyst', targetIndustry: 'Tech', background: 'Ops', motivation: 'Growth',
};

const mockXpertResponse = (jsonBody: Record<string, unknown>) => {
  mockedAxios.post.mockResolvedValue({ data: [{ role: 'assistant', content: JSON.stringify(jsonBody) }] });
};

const getLastRequestBody = (): Record<string, unknown> => (
  mockedAxios.post.mock.calls[mockedAxios.post.mock.calls.length - 1][1] as Record<string, unknown>
);

/** Recursively sorts object keys alphabetically (arrays mapped element-wise, order preserved). */
const sortKeysDeepForTest = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(sortKeysDeepForTest);
  }
  if (value !== null && typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>).sort().reduce<Record<string, unknown>>(
      (sorted, key) => ({ ...sorted, [key]: sortKeysDeepForTest((value as Record<string, unknown>)[key]) }),
      {},
    );
  }
  return value;
};

const buildExpectedSchema = (candidateLimit: number) => ({
  type: 'object',
  additionalProperties: false,
  properties: {
    retrieval_strategy: {
      type: 'string',
      enum: ['discovery_course_keys', 'algolia_skills_fallback'],
      description: expect.any(String),
    },
    course_keys: {
      type: 'array',
      items: { type: 'string', minLength: 1, description: expect.any(String) },
      minItems: 1,
      maxItems: candidateLimit,
      uniqueItems: true,
      description: expect.any(String),
    },
    fallback: {
      type: ['object', 'null'],
      additionalProperties: false,
      description: expect.any(String),
      properties: {
        skills_required: {
          type: 'array',
          items: { type: 'string', minLength: 1 },
          minItems: 1,
          maxItems: 3,
          uniqueItems: true,
          description: expect.any(String),
        },
        skills_preferred: {
          type: 'array',
          items: { type: 'string', minLength: 1 },
          maxItems: 6,
          uniqueItems: true,
          description: expect.any(String),
        },
        condensed_algolia_query: {
          type: 'string', minLength: 1, maxLength: 100, description: expect.any(String),
        },
        roles: {
          type: 'array', items: { type: 'string', minLength: 1 }, uniqueItems: true, description: expect.any(String),
        },
        industries: {
          type: 'array', items: { type: 'string', minLength: 1 }, uniqueItems: true, description: expect.any(String),
        },
        job_sources: {
          type: 'array', items: { type: 'string', minLength: 1 }, uniqueItems: true, description: expect.any(String),
        },
        learner_level: {
          type: 'string', enum: ['introductory', 'intermediate', 'advanced'], description: expect.any(String),
        },
        time_commitment: {
          type: 'string', enum: ['short', 'medium', 'long'], description: expect.any(String),
        },
        exclude_tags: {
          type: 'array', items: { type: 'string', minLength: 1 }, uniqueItems: true, description: expect.any(String),
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

const validFallbackRaw = {
  skills_required: ['Python'],
  skills_preferred: ['SQL', 'Data Visualization'],
  condensed_algolia_query: 'python data analysis',
  roles: ['Data Analyst'],
  industries: ['Technology'],
  job_sources: [],
  learner_level: 'introductory',
  time_commitment: 'medium',
  exclude_tags: [],
};

const validFallbackMapped = {
  skillsRequired: ['Python'],
  skillsPreferred: ['SQL', 'Data Visualization'],
  condensedAlgoliaQuery: 'python data analysis',
  roles: ['Data Analyst'],
  industries: ['Technology'],
  jobSources: [],
  learnerLevel: 'introductory',
  timeCommitment: 'medium',
  excludeTags: [],
};

const groundedResponse = (courseKeys: string[]) => ({
  retrieval_strategy: 'discovery_course_keys', course_keys: courseKeys, fallback: null,
});

const fallbackResponse = (fallback: Record<string, unknown> = validFallbackRaw) => ({
  retrieval_strategy: 'algolia_skills_fallback', course_keys: [], fallback,
});

describe('directCourseKeyRetrievalService.retrieveCourseKeys', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetConfig.mockReturnValue({
      XPERT_API_BASE_URL: 'http://test-xpert.example',
      XPERT_AI_CLIENT_ID: 'test-client-id',
    });
  });

  it('posts to the exact recovered URL', async () => {
    mockXpertResponse(groundedResponse(['org+course-1']));

    await directCourseKeyRetrievalService.retrieveCourseKeys(stubLearnerIntent);

    expect(mockedAxios.post).toHaveBeenCalledWith('http://test-xpert.example/v1/message', expect.anything());
  });

  it('sends the exact recovered request field names, with system_message as a real, non-empty string', async () => {
    mockXpertResponse(fallbackResponse());

    await directCourseKeyRetrievalService.retrieveCourseKeys(stubLearnerIntent);

    const body = getLastRequestBody();
    expect(Object.keys(body)).toEqual(['client_id', 'messages', 'system_message', 'conversation_id', 'stream', 'tags']);
    expect(body.client_id).toBe('test-client-id');
    expect(typeof body.system_message).toBe('string');
    expect((body.system_message as string).length).toBeGreaterThan(0);
  });

  describe('system prompt construction', () => {
    const getSystemMessage = async (): Promise<string> => {
      mockXpertResponse(fallbackResponse());
      await directCourseKeyRetrievalService.retrieveCourseKeys(stubLearnerIntent);
      return getLastRequestBody().system_message as string;
    };

    it('never contains the stray "buildSystemPrompt" token', async () => {
      const systemMessage = await getSystemMessage();

      expect(systemMessage).not.toContain('buildSystemPrompt');
    });

    it('references the document\'s "_id" field as the canonical course-key source, via a placeholder rather than a concrete example value', async () => {
      const systemMessage = await getSystemMessage();

      expect(systemMessage).toContain('"_id"');
      expect(systemMessage).not.toContain('edX+EDX-RapidAI');
      expect(systemMessage).not.toContain('org+course-1');
    });

    it('describes both outcomes and instructs choosing the fallback when uncertain', async () => {
      const systemMessage = await getSystemMessage();

      expect(systemMessage).toContain('discovery_course_keys');
      expect(systemMessage).toContain('algolia_skills_fallback');
      expect(systemMessage.toLowerCase()).toContain('choose the fallback');
    });

    it('never derives a course key from a URL, slug, title, or UUID', async () => {
      const systemMessage = await getSystemMessage();

      expect(systemMessage).toContain('Never derive');
      expect(systemMessage).toMatch(/slug/i);
      expect(systemMessage).toMatch(/UUID/i);
    });

    it('interpolates the given candidateLimit into the prompt text, not a literal template token', async () => {
      mockXpertResponse(fallbackResponse());
      await directCourseKeyRetrievalService.retrieveCourseKeys(stubLearnerIntent, { candidateLimit: 7 });
      const systemMessage = getLastRequestBody().system_message as string;

      expect(systemMessage).toContain('up to 7 course keys');
      expect(systemMessage).not.toContain('{{candidateLimit}}');
    });

    it('appends an EXPECTED OUTPUT SCHEMA block as parseable, sorted-key JSON matching the two-outcome schema contract, with candidateLimit interpolated into maxItems', async () => {
      mockXpertResponse(fallbackResponse());
      await directCourseKeyRetrievalService.retrieveCourseKeys(stubLearnerIntent);
      const systemMessage = getLastRequestBody().system_message as string;

      const [basePrompt, schemaBlock] = systemMessage.split('\n\nEXPECTED OUTPUT SCHEMA:\n');
      expect(schemaBlock).toBeDefined();

      const parsedSchema = JSON.parse(schemaBlock);
      expect(parsedSchema).toEqual(buildExpectedSchema(DIRECT_COURSE_CANDIDATE_LIMIT));
      expect(parsedSchema.properties.course_keys.maxItems).toBe(DIRECT_COURSE_CANDIDATE_LIMIT);

      // Proves sortKeysDeep actually ran (not left in declaration order): the natural
      // schema, sorted with the same well-defined recursive-alphabetical algorithm the
      // production code uses, must byte-for-byte match the rendered block.
      expect(schemaBlock).toBe(JSON.stringify(sortKeysDeepForTest(parsedSchema), null, 2));

      expect(basePrompt).not.toContain('"course_keys": ["string"]');
    });

    it('interpolates an overridden candidateLimit into the schema\'s maxItems', async () => {
      mockXpertResponse(fallbackResponse());
      await directCourseKeyRetrievalService.retrieveCourseKeys(stubLearnerIntent, { candidateLimit: 5 });
      const systemMessage = getLastRequestBody().system_message as string;
      const [, schemaBlock] = systemMessage.split('\n\nEXPECTED OUTPUT SCHEMA:\n');

      expect(JSON.parse(schemaBlock).properties.course_keys.maxItems).toBe(5);
    });

    it('documents additionalProperties: false at the root and on the fallback object', async () => {
      const systemMessage = await getSystemMessage();
      const [, schemaBlock] = systemMessage.split('\n\nEXPECTED OUTPUT SCHEMA:\n');
      const parsedSchema = JSON.parse(schemaBlock);

      expect(parsedSchema.additionalProperties).toBe(false);
      expect(parsedSchema.properties.fallback.additionalProperties).toBe(false);
    });
  });

  it('serializes the canonical LearnerIntent as the single user message content', async () => {
    mockXpertResponse(fallbackResponse());

    await directCourseKeyRetrievalService.retrieveCourseKeys(stubLearnerIntent);

    const body = getLastRequestBody();
    expect(body.messages).toEqual([{ role: 'user', content: JSON.stringify(stubLearnerIntent) }]);
  });

  it('always sends stream: false', async () => {
    mockXpertResponse(fallbackResponse());

    await directCourseKeyRetrievalService.retrieveCourseKeys(stubLearnerIntent);

    expect(getLastRequestBody().stream).toBe(false);
  });

  it('always serializes the confirmed Discovery RAG tags', async () => {
    mockXpertResponse(fallbackResponse());

    await directCourseKeyRetrievalService.retrieveCourseKeys(stubLearnerIntent);

    expect(getLastRequestBody().tags).toEqual(['discovery', 'edx-available-course']);
  });

  it('includes the caller-provided conversationId when supplied', async () => {
    mockXpertResponse(fallbackResponse());

    await directCourseKeyRetrievalService.retrieveCourseKeys(stubLearnerIntent, { conversationId: 'conv-123' });

    expect(getLastRequestBody().conversation_id).toBe('conv-123');
  });

  it('leaves conversation_id undefined when not supplied', async () => {
    mockXpertResponse(fallbackResponse());

    await directCourseKeyRetrievalService.retrieveCourseKeys(stubLearnerIntent);

    expect(getLastRequestBody().conversation_id).toBeUndefined();
  });

  it('rejects with DirectCourseKeyRetrievalError before any network call when XPERT_API_BASE_URL is missing', async () => {
    mockedGetConfig.mockReturnValue({ XPERT_API_BASE_URL: null, XPERT_AI_CLIENT_ID: 'test-client-id' });

    await expect(directCourseKeyRetrievalService.retrieveCourseKeys(stubLearnerIntent))
      .rejects.toThrow(DirectCourseKeyRetrievalError);
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });

  it('rejects with DirectCourseKeyRetrievalError before any network call when XPERT_AI_CLIENT_ID is missing', async () => {
    mockedGetConfig.mockReturnValue({ XPERT_API_BASE_URL: 'http://test-xpert.example', XPERT_AI_CLIENT_ID: null });

    await expect(directCourseKeyRetrievalService.retrieveCourseKeys(stubLearnerIntent))
      .rejects.toThrow(DirectCourseKeyRetrievalError);
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });

  describe('grounded discovery_course_keys branch', () => {
    it('accepts a single grounded key', async () => {
      mockXpertResponse(groundedResponse(['edX+EDX-RapidAI']));

      const result = await directCourseKeyRetrievalService.retrieveCourseKeys(stubLearnerIntent);

      expect(result).toEqual({
        retrievalStrategy: 'discovery_course_keys', courseKeys: ['edX+EDX-RapidAI'], fallback: null,
      });
    });

    it('accepts fewer grounded keys than candidateLimit, in the given order', async () => {
      mockXpertResponse(groundedResponse(['org+course-1', 'org+course-2']));

      const result = await directCourseKeyRetrievalService
        .retrieveCourseKeys(stubLearnerIntent, { candidateLimit: 20 });

      expect(result.courseKeys).toEqual(['org+course-1', 'org+course-2']);
    });

    it('accepts exactly candidateLimit grounded keys without padding or trimming the list', async () => {
      const keys = Array.from({ length: 20 }, (_, i) => `org+course-${i}`);
      mockXpertResponse(groundedResponse(keys));

      const result = await directCourseKeyRetrievalService.retrieveCourseKeys(stubLearnerIntent);

      expect(result.courseKeys).toEqual(keys);
    });

    it('rejects an empty course_keys array', async () => {
      mockXpertResponse(groundedResponse([]));

      await expect(directCourseKeyRetrievalService.retrieveCourseKeys(stubLearnerIntent))
        .rejects.toThrow(DirectCourseKeyRetrievalError);
    });

    it('rejects more than candidateLimit course keys', async () => {
      mockXpertResponse(groundedResponse(Array.from({ length: 21 }, (_, i) => `org+course-${i}`)));

      await expect(directCourseKeyRetrievalService.retrieveCourseKeys(stubLearnerIntent))
        .rejects.toThrow(DirectCourseKeyRetrievalError);
    });

    it('rejects an empty-string course key', async () => {
      mockXpertResponse(groundedResponse(['org+course-1', '']));

      await expect(directCourseKeyRetrievalService.retrieveCourseKeys(stubLearnerIntent))
        .rejects.toThrow(DirectCourseKeyRetrievalError);
    });

    it('rejects a course key with leading or trailing whitespace, rather than trimming it', async () => {
      mockXpertResponse(groundedResponse([' org+course-1']));

      await expect(directCourseKeyRetrievalService.retrieveCourseKeys(stubLearnerIntent))
        .rejects.toThrow(DirectCourseKeyRetrievalError);
    });

    it('rejects duplicate course keys, rather than deduplicating them', async () => {
      mockXpertResponse(groundedResponse(['org+course-1', 'org+course-1']));

      await expect(directCourseKeyRetrievalService.retrieveCourseKeys(stubLearnerIntent))
        .rejects.toThrow(DirectCourseKeyRetrievalError);
    });

    it('rejects a non-null fallback', async () => {
      mockXpertResponse({
        retrieval_strategy: 'discovery_course_keys', course_keys: ['org+course-1'], fallback: validFallbackRaw,
      });

      await expect(directCourseKeyRetrievalService.retrieveCourseKeys(stubLearnerIntent))
        .rejects.toThrow(DirectCourseKeyRetrievalError);
    });

    it('rejects a non-string element', async () => {
      mockXpertResponse({
        retrieval_strategy: 'discovery_course_keys', course_keys: ['org+course-1', 42], fallback: null,
      });

      await expect(directCourseKeyRetrievalService.retrieveCourseKeys(stubLearnerIntent))
        .rejects.toThrow(DirectCourseKeyRetrievalError);
    });
  });

  describe('algolia_skills_fallback branch', () => {
    it('accepts a fully valid fallback object with non-empty optional arrays', async () => {
      mockXpertResponse(fallbackResponse());

      const result = await directCourseKeyRetrievalService.retrieveCourseKeys(stubLearnerIntent);

      expect(result).toEqual({
        retrievalStrategy: 'algolia_skills_fallback', courseKeys: [], fallback: validFallbackMapped,
      });
    });

    it('accepts a fully valid fallback object with empty optional-content arrays', async () => {
      mockXpertResponse(fallbackResponse({
        ...validFallbackRaw,
        skills_preferred: [],
        roles: [],
        industries: [],
        exclude_tags: [],
      }));

      const result = await directCourseKeyRetrievalService.retrieveCourseKeys(stubLearnerIntent);

      expect(result.retrievalStrategy).toBe('algolia_skills_fallback');
      if (result.retrievalStrategy === 'algolia_skills_fallback') {
        expect(result.fallback.skillsPreferred).toEqual([]);
        expect(result.fallback.roles).toEqual([]);
      }
    });

    it('rejects a non-empty course_keys array', async () => {
      mockXpertResponse({
        retrieval_strategy: 'algolia_skills_fallback', course_keys: ['org+course-1'], fallback: validFallbackRaw,
      });

      await expect(directCourseKeyRetrievalService.retrieveCourseKeys(stubLearnerIntent))
        .rejects.toThrow(DirectCourseKeyRetrievalError);
    });

    it.each(Object.keys(validFallbackRaw))('rejects a fallback object missing required key "%s"', async (key) => {
      const incomplete: Record<string, unknown> = { ...validFallbackRaw };
      delete incomplete[key];
      mockXpertResponse(fallbackResponse(incomplete));

      await expect(directCourseKeyRetrievalService.retrieveCourseKeys(stubLearnerIntent))
        .rejects.toThrow(DirectCourseKeyRetrievalError);
    });

    it('rejects a fallback object with an extra, unknown property', async () => {
      mockXpertResponse(fallbackResponse({ ...validFallbackRaw, extra_field: 'unexpected' }));

      await expect(directCourseKeyRetrievalService.retrieveCourseKeys(stubLearnerIntent))
        .rejects.toThrow(DirectCourseKeyRetrievalError);
    });

    it('rejects empty skills_required', async () => {
      mockXpertResponse(fallbackResponse({ ...validFallbackRaw, skills_required: [] }));

      await expect(directCourseKeyRetrievalService.retrieveCourseKeys(stubLearnerIntent))
        .rejects.toThrow(DirectCourseKeyRetrievalError);
    });

    it('rejects skills_required with more than 3 items', async () => {
      mockXpertResponse(fallbackResponse({ ...validFallbackRaw, skills_required: ['A', 'B', 'C', 'D'] }));

      await expect(directCourseKeyRetrievalService.retrieveCourseKeys(stubLearnerIntent))
        .rejects.toThrow(DirectCourseKeyRetrievalError);
    });

    it('rejects duplicate values in skills_required', async () => {
      mockXpertResponse(fallbackResponse({ ...validFallbackRaw, skills_required: ['Python', 'Python'] }));

      await expect(directCourseKeyRetrievalService.retrieveCourseKeys(stubLearnerIntent))
        .rejects.toThrow(DirectCourseKeyRetrievalError);
    });

    it('rejects skills_preferred with more than 6 items', async () => {
      mockXpertResponse(fallbackResponse({
        ...validFallbackRaw, skills_preferred: ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
      }));

      await expect(directCourseKeyRetrievalService.retrieveCourseKeys(stubLearnerIntent))
        .rejects.toThrow(DirectCourseKeyRetrievalError);
    });

    it('rejects duplicate values in skills_preferred', async () => {
      mockXpertResponse(fallbackResponse({ ...validFallbackRaw, skills_preferred: ['SQL', 'SQL'] }));

      await expect(directCourseKeyRetrievalService.retrieveCourseKeys(stubLearnerIntent))
        .rejects.toThrow(DirectCourseKeyRetrievalError);
    });

    it.each(['roles', 'industries', 'job_sources', 'exclude_tags'])('rejects a duplicate value in "%s"', async (field) => {
      mockXpertResponse(fallbackResponse({ ...validFallbackRaw, [field]: ['Same', 'Same'] }));

      await expect(directCourseKeyRetrievalService.retrieveCourseKeys(stubLearnerIntent))
        .rejects.toThrow(DirectCourseKeyRetrievalError);
    });

    it.each(['roles', 'industries', 'job_sources', 'exclude_tags'])('rejects an empty-string element in "%s"', async (field) => {
      mockXpertResponse(fallbackResponse({ ...validFallbackRaw, [field]: [''] }));

      await expect(directCourseKeyRetrievalService.retrieveCourseKeys(stubLearnerIntent))
        .rejects.toThrow(DirectCourseKeyRetrievalError);
    });

    it('rejects an invalid learner_level enum value', async () => {
      mockXpertResponse(fallbackResponse({ ...validFallbackRaw, learner_level: 'expert' }));

      await expect(directCourseKeyRetrievalService.retrieveCourseKeys(stubLearnerIntent))
        .rejects.toThrow(DirectCourseKeyRetrievalError);
    });

    it('rejects an invalid time_commitment enum value', async () => {
      mockXpertResponse(fallbackResponse({ ...validFallbackRaw, time_commitment: 'instant' }));

      await expect(directCourseKeyRetrievalService.retrieveCourseKeys(stubLearnerIntent))
        .rejects.toThrow(DirectCourseKeyRetrievalError);
    });

    it('rejects a 1-word condensed_algolia_query', async () => {
      mockXpertResponse(fallbackResponse({ ...validFallbackRaw, condensed_algolia_query: 'python' }));

      await expect(directCourseKeyRetrievalService.retrieveCourseKeys(stubLearnerIntent))
        .rejects.toThrow(DirectCourseKeyRetrievalError);
    });

    it('rejects a 6-word condensed_algolia_query', async () => {
      mockXpertResponse(fallbackResponse({ ...validFallbackRaw, condensed_algolia_query: 'a b c d e f' }));

      await expect(directCourseKeyRetrievalService.retrieveCourseKeys(stubLearnerIntent))
        .rejects.toThrow(DirectCourseKeyRetrievalError);
    });

    it('rejects a condensed_algolia_query over 100 characters', async () => {
      mockXpertResponse(fallbackResponse({ ...validFallbackRaw, condensed_algolia_query: `${'a'.repeat(50)} ${'b'.repeat(50)}` }));

      await expect(directCourseKeyRetrievalService.retrieveCourseKeys(stubLearnerIntent))
        .rejects.toThrow(DirectCourseKeyRetrievalError);
    });

    it('rejects a condensed_algolia_query with leading or trailing whitespace, rather than trimming it', async () => {
      mockXpertResponse(fallbackResponse({ ...validFallbackRaw, condensed_algolia_query: ' python data analysis' }));

      await expect(directCourseKeyRetrievalService.retrieveCourseKeys(stubLearnerIntent))
        .rejects.toThrow(DirectCourseKeyRetrievalError);
    });

    it('rejects a condensed_algolia_query containing a banned generic word as a whole word', async () => {
      mockXpertResponse(fallbackResponse({ ...validFallbackRaw, condensed_algolia_query: 'python career skills' }));

      await expect(directCourseKeyRetrievalService.retrieveCourseKeys(stubLearnerIntent))
        .rejects.toThrow(DirectCourseKeyRetrievalError);
    });

    it('accepts a condensed_algolia_query containing a banned word only as a substring (whole-word matching, not stemming)', async () => {
      mockXpertResponse(fallbackResponse({ ...validFallbackRaw, condensed_algolia_query: 'python careers guidance' }));

      const result = await directCourseKeyRetrievalService.retrieveCourseKeys(stubLearnerIntent);

      expect(result.retrievalStrategy).toBe('algolia_skills_fallback');
    });
  });

  describe('discriminator and envelope validation', () => {
    it('rejects a response with an extra top-level property', async () => {
      mockXpertResponse({ ...groundedResponse(['org+course-1']), extra: 'unexpected' });

      await expect(directCourseKeyRetrievalService.retrieveCourseKeys(stubLearnerIntent))
        .rejects.toThrow(DirectCourseKeyRetrievalError);
    });

    it('rejects a non-object root (array)', async () => {
      mockedAxios.post.mockResolvedValue({ data: [{ role: 'assistant', content: '[]' }] });

      await expect(directCourseKeyRetrievalService.retrieveCourseKeys(stubLearnerIntent))
        .rejects.toThrow(DirectCourseKeyRetrievalError);
    });

    it('rejects a non-object root (primitive)', async () => {
      mockedAxios.post.mockResolvedValue({ data: [{ role: 'assistant', content: '"hello"' }] });

      await expect(directCourseKeyRetrievalService.retrieveCourseKeys(stubLearnerIntent))
        .rejects.toThrow(DirectCourseKeyRetrievalError);
    });

    it('rejects a missing retrieval_strategy', async () => {
      mockedAxios.post.mockResolvedValue({
        data: [{ role: 'assistant', content: JSON.stringify({ course_keys: [], fallback: null }) }],
      });

      await expect(directCourseKeyRetrievalService.retrieveCourseKeys(stubLearnerIntent))
        .rejects.toThrow(DirectCourseKeyRetrievalError);
    });

    it('rejects an unrecognized retrieval_strategy value', async () => {
      mockXpertResponse({ retrieval_strategy: 'something_else', course_keys: [], fallback: null });

      await expect(directCourseKeyRetrievalService.retrieveCourseKeys(stubLearnerIntent))
        .rejects.toThrow(DirectCourseKeyRetrievalError);
    });

    it('rejects a fenced (non-JSON) content string, failing closed rather than stripping the fence', async () => {
      mockedAxios.post.mockResolvedValue({
        data: [{ role: 'assistant', content: `\`\`\`json\n${JSON.stringify(fallbackResponse())}\n\`\`\`` }],
      });

      await expect(directCourseKeyRetrievalService.retrieveCourseKeys(stubLearnerIntent))
        .rejects.toThrow(DirectCourseKeyRetrievalError);
    });

    it('rejects with DirectCourseKeyRetrievalError on an invalid outer envelope (empty array)', async () => {
      mockedAxios.post.mockResolvedValue({ data: [] });

      await expect(directCourseKeyRetrievalService.retrieveCourseKeys(stubLearnerIntent))
        .rejects.toThrow(DirectCourseKeyRetrievalError);
    });

    it('rejects with DirectCourseKeyRetrievalError on an invalid outer envelope (non-array)', async () => {
      mockedAxios.post.mockResolvedValue({ data: { role: 'assistant', content: '{}' } });

      await expect(directCourseKeyRetrievalService.retrieveCourseKeys(stubLearnerIntent))
        .rejects.toThrow(DirectCourseKeyRetrievalError);
    });

    it('rejects with DirectCourseKeyRetrievalError when content is missing/non-string', async () => {
      mockedAxios.post.mockResolvedValue({ data: [{ role: 'assistant' }] });

      await expect(directCourseKeyRetrievalService.retrieveCourseKeys(stubLearnerIntent))
        .rejects.toThrow(DirectCourseKeyRetrievalError);
    });

    it('rejects with DirectCourseKeyRetrievalError when content is not valid JSON', async () => {
      mockedAxios.post.mockResolvedValue({ data: [{ role: 'assistant', content: 'not json' }] });

      await expect(directCourseKeyRetrievalService.retrieveCourseKeys(stubLearnerIntent))
        .rejects.toThrow(DirectCourseKeyRetrievalError);
    });
  });

  describe('behavioral fixtures', () => {
    it('a relevant document with a visible _id yields an exact grounded result', async () => {
      mockXpertResponse(groundedResponse(['edX+EDX-RapidAI']));

      const result = await directCourseKeyRetrievalService.retrieveCourseKeys(stubLearnerIntent);

      expect(result).toEqual({
        retrievalStrategy: 'discovery_course_keys', courseKeys: ['edX+EDX-RapidAI'], fallback: null,
      });
    });

    it('content/URL-only retrieval (no usable _id) yields the fallback, never an inferred key', async () => {
      mockXpertResponse(fallbackResponse());

      const result = await directCourseKeyRetrievalService.retrieveCourseKeys(stubLearnerIntent);

      expect(result.retrievalStrategy).toBe('algolia_skills_fallback');
      expect(result.courseKeys).toEqual([]);
    });

    it('irrelevant or absent documents yield the fallback', async () => {
      mockXpertResponse(fallbackResponse());

      const result = await directCourseKeyRetrievalService.retrieveCourseKeys(stubLearnerIntent);

      expect(result.retrievalStrategy).toBe('algolia_skills_fallback');
    });

    it('several relevant documents yield only exact grounded keys, ordered, never padded to the candidate limit', async () => {
      mockXpertResponse(groundedResponse(['org+course-1', 'org+course-2', 'org+course-3']));

      const result = await directCourseKeyRetrievalService
        .retrieveCourseKeys(stubLearnerIntent, { candidateLimit: 20 });

      expect(result.courseKeys).toEqual(['org+course-1', 'org+course-2', 'org+course-3']);
      expect(result.courseKeys.length).toBeLessThan(20);
    });
  });

  it('propagates a network rejection untouched, without fallback or retry', async () => {
    const networkError = new Error('Network Error');
    mockedAxios.post.mockRejectedValue(networkError);

    await expect(directCourseKeyRetrievalService.retrieveCourseKeys(stubLearnerIntent))
      .rejects.toThrow(networkError);
    expect(mockedAxios.post).toHaveBeenCalledTimes(1);
  });
});
