import axios from 'axios';
import { SearchIntent, CareerOption, CreateLearnerProfileArgs, TaxonomyFilters } from '../types';

/**
 * Preprocessed user data ready for LLM extraction.
 */
export interface PreprocessedInput {
  freeText: string;        // Cleaned primary user input
  selectedGoals?: string[]; // Extracted from "Career Goal" and "Industry" fields
  knownContext?: string[];  // Extracted from "Background" and "Skills" fields
  preferences?: string[];   // Map of technical/style preferences (e.g., "practical", "certificate")
}

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const DEFAULT_MODEL = 'gpt-4o-mini';

/**
 * Service for extracting semantic user intent using OpenAI Structured Outputs.
 */
export const intentExtractionService = {
  /**
   * Main entry point for converting user input into intent.
   *
   * @param input The preprocessed user data.
   * @param apiKey OpenAI API key.
   * @param facets Optional taxonomy facets to help normalize the extraction.
   * @returns A validated and normalized SearchIntent object.
   */
  async extractIntent(
    input: PreprocessedInput,
    apiKey: string,
    facets?: TaxonomyFilters | null,
  ): Promise<SearchIntent> {
    if (!apiKey) {
      throw new Error('MISSING_API_KEY');
    }

    const jsonSchema = {
      type: 'object',
      properties: {
        roles: {
          type: 'array',
          items: { type: 'string' },
          description: 'Target roles or career titles extracted from user goals. Return empty array if unknown.',
        },
        skillsRequired: {
          type: 'array',
          items: { type: 'string' },
          description: 'Must-have skills identified for the target role/goal. Return empty array if unknown.',
        },
        skillsPreferred: {
          type: 'array',
          items: { type: 'string' },
          description: 'Nice-to-have skills that align with user interests. Return empty array if unknown.',
        },
        learnerLevel: {
          type: 'string',
          enum: ['beginner', 'intermediate', 'advanced'],
          description: "Normalized proficiency level of the learner. Default to 'beginner' if unknown.",
        },
        queryTerms: {
          type: 'array',
          items: { type: 'string' },
          description: 'Raw search terms to be used in broad text matching. Return empty array if unknown.',
        },
        excludeTags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Topics or keywords to explicitly exclude from results. Return empty array if unknown.',
        },
        timeCommitment: {
          type: 'string',
          enum: ['short', 'medium', 'long'],
          description: "Estimated duration preference for the learning journey. Default to 'medium' if unknown.",
        },
      },
      required: [
        'roles',
        'skillsRequired',
        'skillsPreferred',
        'learnerLevel',
        'queryTerms',
        'excludeTags',
        'timeCommitment',
      ],
      additionalProperties: false,
    };

    try {
      const response = await axios.post(
        OPENAI_API_URL,
        {
          model: DEFAULT_MODEL,
          messages: [
            {
              role: 'system',
              content:
                `You are a precision intent extraction engine. Map user goals and background into a structured SearchIntent object. Focus on standardizing career roles and identifying essential skill requirements for those roles.${facets ? `\n\nUse the following available taxonomy facets to normalize your output if they match the user's intent: ${JSON.stringify(facets)}` : ''}`,
            },
            {
              role: 'user',
              content: JSON.stringify(input),
            },
          ],
          response_format: {
            type: 'json_schema',
            json_schema: {
              name: 'SearchIntent',
              strict: true,
              schema: jsonSchema,
            },
          },
          temperature: 0,
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        },
      );

      const { content } = response.data.choices[0].message;
      return JSON.parse(content);
    } catch (error) {
      console.error('Failed to extract intent via OpenAI:', error);
      throw error;
    }
  },

  /**
   * Preprocesses raw intake form arguments into a compact structure for the LLM.
   *
   * @param args The raw intake form responses.
   * @returns Preprocessed input.
   */
  preprocessInput(args: CreateLearnerProfileArgs): PreprocessedInput {
    // 1. Clean noise and conversational fillers
    const cleanText = (text: string) => text.trim().replace(/^I want to learn |Please show me |Could you help me with /gi, '');

    // 2. Map fixed-choice UI strings to concise keywords (Local Normalization)
    const mapTime = (time: string) => {
      const t = time.toLowerCase();
      if (t.includes('0-2') || t.includes('short')) return 'short';
      if (t.includes('2-5') || t.includes('medium')) return 'medium';
      if (t.includes('5+') || t.includes('long')) return 'long';
      return t;
    };

    return {
      freeText: cleanText(args.bringsYouHereRes),
      selectedGoals: [args.careerGoalRes, args.industryRes].filter(Boolean),
      knownContext: [args.backgroundRes].filter(Boolean),
      preferences: [
        args.learningPrefRes,
        mapTime(args.timeAvailableRes),
        args.certificateRes,
      ].filter(Boolean),
    };
  },
};
