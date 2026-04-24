import { xpertService } from './xpert.service';
import { xpertCatalogTranslationPrompt } from './xpertCatalogTranslationPrompt';
import { XpertCatalogTranslationPayload, XpertMessage } from '../types';
import { InterceptContext } from '../hooks/usePromptInterceptor';
import { PromptInterceptFn } from './intentExtraction.xpert.service';

/**
 * Lightweight debug metadata returned alongside the raw Xpert translation response.
 */
export interface CatalogTranslationXpertDebug {
  /** The full system prompt string used for the translation request. */
  systemPrompt: string;
  /** The unparsed JSON response from Xpert. */
  rawResponse: string;
  /** Total execution time for the Xpert call in milliseconds. */
  durationMs: number;
  /** Whether the API call completed without network or service errors. */
  success: boolean;
  /** Optional RAG control tags used for the request. */
  tags?: string[];
  /** Discovery data from Xpert RAG retrieval. */
  discovery?: any;
  /** Whether discovery RAG was used during the request. */
  wasDiscoveryUsed?: boolean;
}

/**
 * Result shape returned by the catalog translation Xpert service.
 */
export interface CatalogTranslationXpertResult {
  /** The raw, unparsed JSON string returned by Xpert. */
  rawResponse: string;
  /** Execution and performance metrics for the stage. */
  debug: CatalogTranslationXpertDebug;
}

/**
 * AI service for grounding taxonomy terms into the learner's specific course catalog.
 *
 * Pipeline context: This is an optional stage within the 'catalogTranslation' phase.
 * It is only invoked when the deterministic 'rulesFirstMapping' stage cannot find
 * exact or alias matches for certain taxonomy skills or job titles.
 *
 * It uses a 'facetSnapshot' of the actual catalog to ensure the AI only suggests
 * search terms that will actually return results.
 */
export const catalogTranslationXpertService = {
  /**
   * Executes the catalog translation prompt via Xpert for unmatched taxonomy terms.
   * Handles prompt interception for debugging and returns the raw AI response.
   *
   * @param payload The structured payload containing unmatched terms and the catalog facet snapshot.
   * @param interceptPrompt Optional hook to allow manual prompt editing in debug mode.
   * @returns A result object with the raw response string and debug metadata.
   * @throws Error if the user cancels the generation during prompt interception.
   */
  async translateUnmatched(
    payload: XpertCatalogTranslationPayload,
    interceptPrompt?: PromptInterceptFn,
    tags?: string[],
  ): Promise<CatalogTranslationXpertResult> {
    const startTime = Date.now();
    const { bundle: originalBundle, userPayload } = xpertCatalogTranslationPrompt.buildTranslationPrompt(payload);
    originalBundle.tags = tags;

    // --- Interception Logic ---
    let activeBundle = originalBundle;
    if (interceptPrompt) {
      const userMessages: XpertMessage[] = [{ role: 'user', content: JSON.stringify(userPayload) }];
      const context: InterceptContext = {
        label: 'Catalog Translation',
        messages: userMessages,
        meta: { stage: 'catalogTranslation', careerTitle: payload.careerTitle },
      };
      const result = await interceptPrompt(originalBundle, context);
      if (result.decision === 'cancelled') {
        throw new Error('PromptInterceptor: catalog translation cancelled by user');
      }
      if (result.decision === 'accepted') {
        activeBundle = result.bundle ?? originalBundle;
      }
      // If rejected, keep the original untampered bundle.
    }
    // --- End Interception ---

    const systemPrompt = activeBundle.combined;
    const activeTags = activeBundle.tags;

    try {
      const response = await xpertService.sendMessage({
        systemMessage: systemPrompt,
        messages: [
          {
            role: 'user',
            content: JSON.stringify(userPayload),
          },
        ],
        tags: activeTags,
      });

      return {
        rawResponse: response.content,
        debug: {
          systemPrompt,
          rawResponse: response.content,
          durationMs: Date.now() - startTime,
          success: true,
          tags: activeTags,
          discovery: response.discovery,
        },
      };
    } catch {
      return {
        rawResponse: '',
        debug: {
          systemPrompt,
          rawResponse: '',
          durationMs: Date.now() - startTime,
          success: false,
          tags: activeTags,
        },
      };
    }
  },
};
