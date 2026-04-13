import { intakePreprocessor, PreprocessedInput } from './intakePreprocessor';
import { xpertService, XpertMessage } from './xpert.service';
import { xpertContractService, DEFAULT_INTENT } from './xpertContract';
import {
  FacetReference, CareerOption, XpertPromptBundle, PromptPart,
} from '../types';
import { XpertExtractionResult } from './xpertDebug';
import { InterceptContext, InterceptResult } from '../hooks/usePromptInterceptor';

/** Subset of the interceptor hook needed by this service. */
export type PromptInterceptFn = (
  bundle: XpertPromptBundle,
  context: InterceptContext,
) => Promise<InterceptResult>;

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
    interceptPrompt?: PromptInterceptFn,
  ): Promise<XpertExtractionResult> {
    const startTime = Date.now();
    const originalBundle = this.buildSystemPrompt(facets);

    // --- interception ---
    let activeBundle = originalBundle;
    if (interceptPrompt) {
      const userMessages: XpertMessage[] = [{ role: 'user', content: JSON.stringify(input) }];
      const context: InterceptContext = {
        label: 'Intent Extraction',
        messages: userMessages,
        meta: { stage: 'intentExtraction' },
      };
      const result = await interceptPrompt(originalBundle, context);
      if (result.decision === 'cancelled') {
        throw new Error('PromptInterceptor: intent extraction cancelled by user');
      }
      if (result.decision === 'accepted') {
        activeBundle = result.bundle ?? originalBundle;
      }
      // 'rejected' → keep originalBundle (activeBundle already set)
    }
    // --- end interception ---

    const systemPrompt = activeBundle.combined;
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
   * Builds the structured prompt bundle for Xpert intent extraction.
   * The `combined` field is byte-for-byte identical to the previous raw string return value.
   */
  buildSystemPrompt(facets?: FacetReference | null): XpertPromptBundle {
    const baseContent = `You are a precision intent extraction engine. Map user goals and background into a structured XpertIntent object.

Your objective is to produce output that is both semantically relevant and effective for retrieval.

You MUST generate a condensedQuery that is:
- a single short phrase
- 2-5 words
- plain keywords only
- no punctuation
- suitable for Algolia search

Search behavior guidance:
- The primary searchable fields are:
  - name
  - skills.name
- condensedQuery should target broad, high-recall role or skill concepts from those searchable fields.
- Prefer a query that returns several close matches over a highly specific query that returns zero results.
- Do NOT overfit to the exact wording of the user's story, prior role, or transition phrasing.
- When the user describes a transition, prioritize the destination role or the most transferable target skill area.
- Normalize specific language into broader common searchable concepts.

Facet guidance:
- Use common facet values as anchors for retrieval.
- Facet prevalence is a useful signal: more common values are generally better candidates.
- Preserve nuance using structured facet outputs instead of forcing every detail into condensedQuery.

Output behavior:
- condensedQuery should be broad enough to retrieve relevant results.
- Return supporting facet selections that reflect the user's likely interests.
- Prefer close, general matches over narrow exactness.

You MUST respond with only a valid JSON object matching the schema. Raw JSON only. No markdown.`;

    const basePart: PromptPart = {
      label: 'base',
      content: baseContent,
      editable: true,
      required: true,
    };

    if (facets) {
      const facetContextContent = `
Use the following available facet values to normalize your output.

Primary searchable facet sources:
- Jobs / Roles (name): ${facets.name.slice(0, 50).map(f => f.value).join(', ')}
- Skills (skills.name): ${facets.skills.slice(0, 50).map(f => f.value).join(', ')}

Supporting facet sources:
- Industries (industry_names): ${facets.industries.slice(0, 30).map(f => f.value).join(', ')}
- Job Sources (job_sources): ${facets.jobSources.slice(0, 30).map(f => f.value).join(', ')}

Rules:
- Build condensedQuery primarily from broad, common values in name and skills.name.
- Use the sorted order as a signal of prevalence and retrievability.
- Prefer broader high-signal facet values over niche or compound phrases.
- Do not overfit to exact narrative wording.
- If the user is transitioning fields, generalize toward the target role or adjacent transferable skill area.
- Use supporting facets to preserve useful context that should not be forced into condensedQuery.
- Return the closest relevant facet values, even when they are somewhat more general than the user's words.
`;

      const facetContextPart: PromptPart = {
        label: 'facetContext',
        content: facetContextContent,
        editable: true,
        required: false,
      };

      return {
        id: 'intentExtraction',
        stage: 'intentExtraction',
        parts: [basePart, facetContextPart],
        combined: `${baseContent}\n\n${facetContextContent}`,
      };
    }

    return {
      id: 'intentExtraction',
      stage: 'intentExtraction',
      parts: [basePart],
      combined: baseContent,
    };
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
      });

      let parsed: CareerOption[];
      try {
        parsed = JSON.parse(response.content);
      } catch {
        return [];
      }

      return parsed;
    } catch {
      return [];
    }
  },

  /**
   * Re-export preprocessInput from original service for consistency.
   */
  preprocessInput: intakePreprocessor.preprocessInput,
};
