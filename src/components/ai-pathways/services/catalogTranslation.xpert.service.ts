import { xpertService } from './xpert.service';
import { xpertCatalogTranslationPrompt } from './xpertCatalogTranslationPrompt';
import { XpertCatalogTranslationPayload } from '../types';

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
  ): Promise<CatalogTranslationXpertResult> {
    const startTime = Date.now();
    const { systemPrompt, userPayload } = xpertCatalogTranslationPrompt.buildTranslationPrompt(payload);

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
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[catalogTranslationXpertService] Failed to execute catalog translation via Xpert:', error);
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
