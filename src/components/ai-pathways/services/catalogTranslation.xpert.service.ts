import { xpertService, XpertMessage } from './xpert.service';
import { xpertCatalogTranslationPrompt } from './xpertCatalogTranslationPrompt';
import { XpertCatalogTranslationPayload } from '../types';
import { InterceptContext } from '../hooks/usePromptInterceptor';
import { PromptInterceptFn } from './intentExtraction.xpert.service';

/**
 * Lightweight debug metadata returned alongside the raw Xpert response.
 */
export interface CatalogTranslationXpertDebug {
  systemPrompt: string;
  rawResponse: string;
  durationMs: number;
  success: boolean;
}

/**
 * Result shape returned by the catalog translation Xpert service.
 * The rawResponse string is passed directly to catalogTranslationService.processTranslation().
 */
export interface CatalogTranslationXpertResult {
  rawResponse: string;
  debug: CatalogTranslationXpertDebug;
}

/**
 * Optional Xpert execution service for catalog translation.
 * Only invoked when rules-first translation leaves unmatched terms.
 * The result is consumed by catalogTranslationService.processTranslation() as xpertRawResponse.
 */
export const catalogTranslationXpertService = {
  /**
   * Executes the catalog translation prompt via Xpert for unmatched taxonomy terms.
   *
   * @param payload The structured payload containing unmatched terms and the catalog facet snapshot.
   * @returns A CatalogTranslationXpertResult with the raw JSON string and debug metadata.
   */
  async translateUnmatched(
    payload: XpertCatalogTranslationPayload,
    interceptPrompt?: PromptInterceptFn,
  ): Promise<CatalogTranslationXpertResult> {
    const startTime = Date.now();
    const { bundle: originalBundle, userPayload } = xpertCatalogTranslationPrompt.buildTranslationPrompt(payload);

    // --- interception ---
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
      // 'rejected' → keep originalBundle
    }
    // --- end interception ---

    const systemPrompt = activeBundle.combined;

    try {
      const response = await xpertService.sendMessage({
        systemMessage: systemPrompt,
        messages: [
          {
            role: 'user',
            content: JSON.stringify(userPayload),
          },
        ],
      });

      return {
        rawResponse: response.content,
        debug: {
          systemPrompt,
          rawResponse: response.content,
          durationMs: Date.now() - startTime,
          success: true,
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
        },
      };
    }
  },
};
