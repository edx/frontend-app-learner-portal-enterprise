import { XpertCatalogTranslationPayload, XpertPromptBundle, PromptPart } from '../types';

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
    const baseContent = `You are a career-to-catalog translation engine.
Translate the provided taxonomy career data into catalog-valid search parameters for a course search.

Your objective is to produce output that is both:
- grounded in the provided catalog facet snapshot
- effective for broad, high-recall catalog retrieval

Catalog facet metadata (from Algolia):
The user payload includes a "facetSnapshot" object with authoritative vocabulary extracted from the Algolia index.
- "skill_names": valid skill facet values (use for strictSkills and boostSkills)
- "subjects": valid subject facet values (use for subjectHints)
- "level_type": valid course difficulty levels
- "partners.name": valid partner/institution names

Facet grounding rules:
1. ONLY use values present in "facetSnapshot". Do not invent skills, subjects, or partners.
2. Use "skill_names" for strictSkills and boostSkills.
3. Use "subjects" for subjectHints.
4. Separate core skills (strictSkills) from broader or nice-to-have skills (boostSkills).
5. Use strictSkills only for high-confidence, close matches from the taxonomy input.
6. Use boostSkills for broader, related, adjacent, or lower-confidence matches.
7. If a taxonomy skill has no match in the snapshot, move it to droppedTaxonomySkills.
8. Document each mapping in skillProvenance (matchMethod: "xpert" | "none").

Catalog search behavior guidance:
- The catalog supports broad text search across multiple attributes (title, description, skills, etc.).
- The "query" does NOT need to be a facet value; it should be a broad, high-signal phrase.
- Prefer high-recall queries that return several relevant results over hyper-specific ones.
- Generalize narrative or overly specific inputs toward broad role/subject language.

Query construction rules:
9. Provide a broad search query in "query" and alternative fallbacks in "queryAlternates".
10. The query should be short, plain language, and educational/skill-based.
11. Use subjectHints to preserve topical intent for downstream retrieval.
12. Do NOT force the query to mirror exact prior-job wording.`;

    const schemaContent = `
Output requirements:
13. Return strict JSON only. Do not include any text outside the JSON.
14. The output must be deterministic and grounded only in the provided snapshot data and user payload.

Expected Output Shape:
{
  "query": "string",
  "queryAlternates": ["string"],
  "strictSkills": ["string"],
  "boostSkills": ["string"],
  "subjectHints": ["string"],
  "droppedTaxonomySkills": ["string"],
  "skillProvenance": [
    { "taxonomySkill": "string", "catalogMatch": "string | null", "matchMethod": "xpert" | "none" }
  ]
}`;

    const basePart: PromptPart = {
      label: 'base',
      content: baseContent,
      editable: true,
      required: true,
    };

    const schemaPart: PromptPart = {
      label: 'schema',
      content: schemaContent,
      editable: false,
      required: true,
    };

    const bundle: XpertPromptBundle = {
      id: 'catalogTranslation',
      stage: 'catalogTranslation',
      parts: [basePart, schemaPart],
      combined: `${baseContent}${schemaContent}`,
    };

    const userPayload = {
      careerTitle: payload.careerTitle,
      unmatchedSkills: payload.unmatchedSkills,
      unmatchedIndustries: payload.unmatchedIndustries,
      unmatchedSimilarJobs: payload.unmatchedSimilarJobs,
      facetSnapshot: payload.facetSnapshot,
    };

    return {
      bundle,
      userPayload,
    };
  },
};
