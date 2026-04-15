import { XpertCatalogTranslationPayload, XpertPromptBundle, PromptPart } from '../types';
import { CATALOG_TRANSLATION_PROMPT } from '../constants';

/**
 * Prompt builder for the Catalog Translation stage.
 *
 * Pipeline context: This is an internal helper for the 'catalogTranslation' stage.
 * It constructs the multi-part system prompt and user payload required for Xpert
 * to translate taxonomy terms into catalog-valid search parameters.
 *
 * The builder ensures that the instructions (base), grounding data (snapshot),
 * and output requirements (schema) are consistently composed into an
 * 'XpertPromptBundle'.
 */
export const xpertCatalogTranslationPrompt = {
  /**
   * Builds the multi-part prompt bundle and the structured user payload for Xpert.
   *
   * @param payload The structured data containing unmatched terms and the catalog facet snapshot.
   * @returns An object containing the combined prompt bundle and the user-specific payload.
   */
  buildTranslationPrompt(payload: XpertCatalogTranslationPayload): {
    bundle: XpertPromptBundle;
    userPayload: {
      careerTitle: string;
      unmatchedSkills: string[];
      unmatchedIndustries: string[];
      unmatchedSimilarJobs: string[];
      facetSnapshot: XpertCatalogTranslationPayload['facetSnapshot'];
    };
  } {
    const userPayload = {
      careerTitle: payload.careerTitle,
      unmatchedSkills: payload.unmatchedSkills,
      unmatchedIndustries: payload.unmatchedIndustries,
      unmatchedSimilarJobs: payload.unmatchedSimilarJobs,
      facetSnapshot: payload.facetSnapshot,
    };

    const basePart: PromptPart = {
      label: 'base',
      content: CATALOG_TRANSLATION_PROMPT.BASE_CONTENT,
      editable: true,
      required: true,
    };

    const schemaPart: PromptPart = {
      label: 'schema',
      content: CATALOG_TRANSLATION_PROMPT.SCHEMA_CONTENT,
      editable: false,
      required: true,
    };

    const bundle: XpertPromptBundle = {
      id: 'catalogTranslation',
      stage: 'catalogTranslation',
      parts: [basePart, schemaPart],
      combined: `${CATALOG_TRANSLATION_PROMPT.BASE_CONTENT}${CATALOG_TRANSLATION_PROMPT.SCHEMA_CONTENT}`,
    };

    return {
      bundle,
      userPayload,
    };
  },
};
