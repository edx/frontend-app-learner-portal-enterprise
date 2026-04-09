import { XpertCatalogTranslationPayload } from '../types';

/**
 * Prompt builder for the Xpert system to grounded translation of taxonomy career data
 * into catalog-valid search parameters.
 */
export const xpertCatalogTranslationPrompt = {
  /**
   * Builds the system prompt and the structured user payload for the translation task.
   *
   * @param payload The structured data for the translation stage.
   * @returns An object containing the system prompt string and the user payload.
   */
  buildTranslationPrompt(payload: XpertCatalogTranslationPayload) {
    const systemPrompt = `You are a career-to-catalog translation engine.
Translate the provided taxonomy career data into catalog-valid search parameters for a course search.

Rules:
1. ONLY use facet values that exist in the provided catalog facet snapshot. Do not invent new skills, subjects, or partners.
2. Return a strict JSON object only. Do not include any text outside the JSON.
3. Separate core skills (strictSkills) from broader or nice-to-have skills (boostSkills).
4. Provide a search query (query) and alternative queries (queryAlternates) for broader or fallback searches.
5. List any taxonomy skills that could not be mapped to catalog facets in 'droppedTaxonomySkills'.
6. Document each mapping in 'skillProvenance' (taxonomySkill, catalogMatch, matchMethod: 'xpert' | 'none').
7. If a taxonomy skill has no close match in the catalog snapshot, move it to 'droppedTaxonomySkills' and set its matchMethod to 'none'.
8. The output must be deterministic and grounded only in the provided snapshot data.

Expected Output Shape:
{
  "query": "string",
  "queryAlternates": ["string"],
  "strictSkills": ["string"],
  "boostSkills": ["string"],
  "subjectHints": ["string"],
  "droppedTaxonomySkills": ["string"],
  "skillProvenance": [
    { "taxonomySkill": "string", "catalogMatch": "string", "matchMethod": "xpert" | "none" }
  ]
}
`;

    // The user payload contains all the necessary grounding context:
    // the career title, the unmatched terms from rules-based mapping,
    // and the full catalog facet snapshot (the "allowed" vocabulary).
    const userPayload = {
      careerTitle: payload.careerTitle,
      unmatchedSkills: payload.unmatchedSkills,
      unmatchedIndustries: payload.unmatchedIndustries,
      unmatchedSimilarJobs: payload.unmatchedSimilarJobs,
      facetSnapshot: payload.facetSnapshot,
    };

    return {
      systemPrompt,
      userPayload,
    };
  },
};

/**
 * Example Output for Reference:
 *
 * {
 *   "query": "Software Engineering with Python",
 *   "queryAlternates": ["Python Programming", "Backend Development"],
 *   "strictSkills": ["Python", "SQL"],
 *   "boostSkills": ["REST APIs", "Unit Testing"],
 *   "subjectHints": ["Computer Science", "Information Technology"],
 *   "droppedTaxonomySkills": ["EsotericSkill-42"],
 *   "skillProvenance": [
 *     { "taxonomySkill": "Python", "catalogMatch": "Python", "matchMethod": "xpert" },
 *     { "taxonomySkill": "EsotericSkill-42", "catalogMatch": null, "matchMethod": "none" }
 *   ]
 * }
 */
