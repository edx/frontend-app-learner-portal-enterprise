import { XpertCatalogTranslationPayload, XpertPromptBundle, PromptPart } from '../types';
import { CATALOG_TRANSLATION_PROMPT } from '../constants';

/**
 * @typedef {Object} XpertCatalogTranslationPayload
 * @property {string} careerTitle - User's target career title
 * @property {string[]} unmatchedSkills - Skills that need translation
 * @property {Object} facetSnapshot - Authoritative catalog facets for grounding
 */

/**
 * Prompt builder for translating taxonomy career data into catalog-valid search parameters.
 *
 * @remarks
 * Pipeline: translation (Xpert)
 *
 * Dependencies:
 * - XpertCatalogTranslationPayload contract
 * - XpertPromptBundle type
 *
 * Notes:
 * - The system prompt is highly structured to ensure the LLM stays grounded in the catalog facets.
 */
export const xpertCatalogTranslationPrompt = {
  /**
   * Builds the structured prompt bundle and user payload for the catalog translation task.
   *
   * @param {XpertCatalogTranslationPayload} payload - The structured data for the translation stage.
   * @returns {Object} Object containing the XpertPromptBundle and the structured user payload.
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
