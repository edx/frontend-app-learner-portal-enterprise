import { XpertCatalogTranslationPayload } from '../types';

/**
 * Prompt builder for translating taxonomy career data
 * into catalog-valid search parameters for the course catalog index.
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

Your objective is to produce output that is both:
- grounded in the provided catalog facet snapshot
- effective for broad, high-recall catalog retrieval

Catalog facet metadata (from Algolia):
The user payload includes a "facetSnapshot" object with the following fields extracted directly from the Algolia index:
- "skill_names": valid skill facet values in the catalog (use for strictSkills and boostSkills)
- "subjects": valid subject facet values in the catalog (use for subjectHints)
- "level_type": valid course difficulty levels in the catalog
- "partners.name": valid partner/institution names in the catalog
- "enterprise_catalog_query_uuids": catalog scope identifiers (informational only, do not output)
You MUST treat these as the authoritative vocabulary. Do not output values that are not present in the snapshot.

Catalog search behavior guidance:
- The catalog index supports broad text search across these searchable attributes:
  - title
  - full_description
  - short_description
  - additional_information
  - aggregation_key
  - partners
  - skill_names
  - skills
  - transcript_summary
- Therefore, the search query does NOT need to exactly match one facet value.
- The search query should be a broad, high-signal phrase likely to retrieve relevant catalog content across those searchable attributes.
- Prefer a query that returns several relevant results over a highly specific phrase that returns zero results.
- When the career input is narrative, transitional, or overly specific, generalize toward broad role, subject, or skill language that fits the catalog.

Facet grounding rules:
1. ONLY use values from "facetSnapshot.skill_names" for strictSkills and boostSkills.
2. ONLY use values from "facetSnapshot.subjects" for subjectHints.
3. Do not invent new skills, subjects, or partners — every value must appear in the snapshot.
4. Separate core skills (strictSkills) from broader or nice-to-have skills (boostSkills).
5. Use strictSkills only for high-confidence, close matches from the taxonomy input.
6. Use boostSkills for broader, related, adjacent, or lower-confidence matches that still align to the user's interest.
7. Prefer more common, broadly useful catalog facet values when multiple valid matches exist.
8. If a taxonomy skill has no close match in the catalog facet snapshot, move it to droppedTaxonomySkills and set matchMethod to "none".
9. Document each mapping in skillProvenance using:
   - taxonomySkill
   - catalogMatch
   - matchMethod: "xpert" | "none"

Query construction rules:
10. Provide a broad catalog search query in "query".
11. Provide alternative broader or adjacent fallback searches in "queryAlternates".
12. The query should be:
   - short
   - plain language
   - broad enough to retrieve relevant courses
   - based on the user's likely learning direction, not just exact prior-job wording
13. Do NOT force the query to exactly mirror a career title if a broader educational or skill-based phrase will retrieve better.
14. Prefer broad subject / domain / skill phrasing when appropriate.
15. Use subjectHints to preserve useful topical intent that may help downstream retrieval or ranking.

Output requirements:
16. Return strict JSON only. Do not include any text outside the JSON.
17. The output must be deterministic and grounded only in the provided snapshot data and user payload.

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
