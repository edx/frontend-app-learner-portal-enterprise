import {
  PreprocessedInput,
  intentExtractionService,
} from './intentExtraction.service';
import { xpertService } from './xpert.service';
import { SearchIntent, TaxonomyFilters, CareerOption } from '../types';

/**
 * Service for extracting semantic user intent using Xpert API.
 */
export const intentExtractionXpertService = {
  /**
   * Main entry point for converting user input into intent via Xpert.
   *
   * @param input The preprocessed user data.
   * @param facets Optional taxonomy facets to help normalize the extraction.
   * @returns A validated and normalized SearchIntent object.
   */
  async extractIntent(
    input: PreprocessedInput,
    facets?: TaxonomyFilters | null,
  ): Promise<SearchIntent> {
    const systemMessageBase = `You are a career advisor and content discovery specialist. Your goal is to identify the most relevant educational content from the discovery service to help a user achieve their career goals.
Map user goals and background into a structured SearchIntent object. Focus on standardizing career roles and identifying essential skill requirements for those roles.
The discovery service uses these intents to find the best matching courses.

You MUST generate a condensedQuery that is:
- a single short phrase
- 2-5 words
- plain keywords (no punctuation-heavy sentence fragments)
- suitable as the primary query for Algolia search.

Prefer role/profession keywords over generic motivation words.${facets ? `\n\nUse the following available taxonomy facets to normalize your output if they match the user's intent: ${JSON.stringify(facets)}` : ''}`;

    const jsonInstruction = '\n\nYou MUST respond with only a valid JSON object matching the schema. No markdown fences, no explanation, no preamble. Raw JSON only.';

    try {
      const response = await xpertService.sendMessage({
        systemMessage: `${systemMessageBase}${jsonInstruction}`,
        messages: [
          {
            role: 'user',
            content: JSON.stringify(input),
          },
        ],
        // TODO: confirm correct tag value with Xpert/Discovery team before production
        tags: ['enterprise-course-discovery'],
      });

      let parsed: SearchIntent;
      try {
        parsed = JSON.parse(response.content);
      } catch (parseError) {
        // eslint-disable-next-line no-console
        console.error('Failed to parse Xpert response:', response.content);
        throw parseError;
      }

      const fallbackQuery = (
        parsed.condensedQuery
        || parsed.roles?.[0]
        || parsed.queryTerms?.[0]
        || input.freeText
      )
        .toLowerCase()
        .replace(/[^a-z0-9\s]/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .split(' ')
        .slice(0, 5)
        .join(' ');

      return {
        ...parsed,
        condensedQuery: fallbackQuery || 'career pathways',
      };
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to extract intent via Xpert:', error);
      throw error;
    }
  },

  /**
   * Generates sample careers if the discovery service returns no results.
   *
   * @param input The preprocessed user data.
   * @returns A list of relevant career matches.
   */
  async generateSampleCareers(input: PreprocessedInput): Promise<CareerOption[]> {
    const systemMessage = `You are a career advisor. Based on the user's background and goals, suggest 3 relevant career paths.
For each career, provide:
- title: The name of the career
- percentMatch: A number between 0 and 100 representing how well it matches the user
- skills: A list of 3-5 key skills required for this career
- industries: A list of 1-2 relevant industries

You MUST respond with only a valid JSON array of objects matching the CareerOption schema. No markdown fences, no explanation, no preamble. Raw JSON only.`;

    try {
      const response = await xpertService.sendMessage({
        systemMessage,
        messages: [
          {
            role: 'user',
            content: JSON.stringify(input),
          },
        ],
        // TODO: confirm correct tag value with Xpert/Discovery team before production
        tags: ['enterprise-course-discovery'],
      });

      let parsed: CareerOption[];
      try {
        parsed = JSON.parse(response.content);
      } catch (parseError) {
        // eslint-disable-next-line no-console
        console.error('Failed to parse Xpert sample careers:', response.content);
        return [];
      }

      return parsed;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to generate sample careers via Xpert:', error);
      return [];
    }
  },

  /**
   * Re-export preprocessInput from original service for consistency.
   */
  preprocessInput: intentExtractionService.preprocessInput,
};
