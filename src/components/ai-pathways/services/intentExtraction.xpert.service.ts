import { intakePreprocessor, PreprocessedInput } from './intakePreprocessor';
import { xpertService } from './xpert.service';
import { xpertContractService, DEFAULT_INTENT } from './xpertContract';
import {
  FacetReference, CareerOption,
} from '../types';
import { XpertExtractionResult } from './xpertDebug';

/**
 * Service for extracting semantic user intent using Xpert API.
 */
export const intentExtractionXpertService = {
  /**
   * Main entry point for converting user input into intent via Xpert.
   *
   * @param input The preprocessed user data.
   * @param facets Optional taxonomy facets to help normalize the extraction.
   * @returns A validated and normalized XpertExtractionResult object.
   */
  async extractIntent(
    input: PreprocessedInput,
    facets?: FacetReference | null,
  ): Promise<XpertExtractionResult> {
    const startTime = Date.now();
    const systemPrompt = this.buildSystemPrompt(facets);
    let repairPromptUsed = false;
    let rawResponse = '';
    let validationErrors: string[] = [];

    try {
      const response = await xpertService.sendMessage({
        systemMessage: systemPrompt,
        messages: [
          {
            role: 'user',
            content: JSON.stringify(input),
          },
        ],
      });

      rawResponse = response.content;
      let intent = xpertContractService.parseIntent(rawResponse);
      const validation = intent ? xpertContractService.validateIntent(intent) : { isValid: false, errors: ['Parse failed'] };
      validationErrors = validation.errors;

      if (!validation.isValid) {
        repairPromptUsed = true;
        const repairPrompt = `The previous response was invalid JSON or failed validation.
Errors: ${validation.errors.join(', ')}.
Please correct the JSON and ensure it strictly follows the schema.
You MUST respond with raw JSON only.`;

        const repairResponse = await xpertService.sendMessage({
          systemMessage: systemPrompt,
          messages: [
            { role: 'user', content: JSON.stringify(input) },
            { role: 'assistant', content: rawResponse },
            { role: 'user', content: repairPrompt },
          ],
        });

        rawResponse = repairResponse.content;
        intent = xpertContractService.parseIntent(rawResponse);
        const secondValidation = intent ? xpertContractService.validateIntent(intent) : { isValid: false, errors: ['Parse failed'] };
        validationErrors = secondValidation.errors;
      }

      const normalizedIntent = intent ? xpertContractService.normalizeIntent(intent) : DEFAULT_INTENT;

      return {
        intent: normalizedIntent,
        debug: {
          systemPrompt,
          rawResponse,
          parsedResponse: intent,
          validationErrors,
          repairPromptUsed,
          durationMs: Date.now() - startTime,
          success: !!intent,
        },
      };
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to extract intent via Xpert:', error);
      return {
        intent: DEFAULT_INTENT,
        debug: {
          systemPrompt,
          rawResponse,
          parsedResponse: null,
          validationErrors: [String(error)],
          repairPromptUsed,
          durationMs: Date.now() - startTime,
          success: false,
        },
      };
    }
  },

  /**
   * Builds the system prompt for Xpert intent extraction.
   */
  buildSystemPrompt(facets?: FacetReference | null): string {
    const base = `You are a precision intent extraction engine. Map user goals and background into a structured XpertIntent object.
Focus on standardizing career roles and identifying essential skill requirements for those roles.

You MUST generate a condensedQuery that is:
- a single short phrase
- 2-5 words
- plain keywords (no punctuation)
- suitable for Algolia search.

Prefer role/profession keywords over generic motivation words.

You MUST respond with only a valid JSON object matching the schema. Raw JSON only, no markdown.`;

    if (facets) {
      const facetContext = `
Use the following available taxonomy facets to normalize your output if they match the user's intent:
- Skills: ${facets.skills.slice(0, 50).map(f => f.value).join(', ')}
- Industries: ${facets.industries.map(f => f.value).join(', ')}
- Job Sources: ${facets.jobSources.map(f => f.value).join(', ')}
- Jobs (name): ${facets.name.map(f => f.value).join(', ')}
`;
      return `${base}\n\n${facetContext}`;
    }

    return base;
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
  preprocessInput: intakePreprocessor.preprocessInput,
};
