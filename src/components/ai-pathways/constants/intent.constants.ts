import { XpertIntent, LearnerLevel, TimeCommitment } from '../types';

/**
 * Constants for Xpert intent extraction and prompt construction.
 *
 * Used in: intent extraction service, prompt building, and contract validation.
 * Extend when adding new intent fields or adjusting prompt instructions.
 */

export const LEARNER_LEVELS: LearnerLevel[] = ['beginner', 'intermediate', 'advanced'];
export const TIME_COMMITMENTS: TimeCommitment[] = ['short', 'medium', 'long'];

export const DEFAULT_INTENT: XpertIntent = {
  condensedQuery: 'career development',
  roles: [],
  skillsRequired: [],
  skillsPreferred: [],
  industries: [],
  jobSources: [],
  learnerLevel: 'beginner',
  timeCommitment: 'medium',
  excludeTags: [],
};

export const CATALOG_TRANSLATION_PROMPT = {
  BASE_CONTENT: `You are a career-to-catalog translation engine.
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
12. Do NOT force the query to mirror exact prior-job wording.`,

  SCHEMA_CONTENT: `
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
}`,
};

export const PATHWAY_ENRICHMENT_PROMPT = {
  SYSTEM_MESSAGE_BASE: 'You are a career advisor and learning pathway architect. Your objective is to help the user understand why each course retrieved by the discovery service is essential for their chosen career path. For each course provided, write a short, one-sentence reasoning explaining why it is perfect for the user based on their goals and required skills. Be encouraging and specific, highlighting how the course content bridges their current background with their target role.',
  JSON_INSTRUCTION: '\n\nYou MUST respond with only a valid JSON object matching the schema. Each reasoning item must include the "id" of the course it refers to. Raw JSON only.',
} as const;

export const INTENT_EXTRACTION_PROMPT = {
  BASE_CONTENT: `You are a precision intent extraction engine. Map user goals and background into a structured XpertIntent object.

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

You MUST respond with only a valid JSON object matching the schema. Raw JSON only. No markdown.`,

  REPAIR_PROMPT: `The previous response was invalid JSON or failed validation.
Errors: {errors}.
Please correct the JSON and ensure it strictly follows the schema.
You MUST respond with raw JSON only.`,

  SAMPLE_CAREERS_SYSTEM_MESSAGE: `You are a career advisor. Based on the user's background and goals, suggest 3 relevant career paths.
For each career, provide:
- title: The name of the career
- percentMatch: A number between 0 and 100 representing how well it matches the user
- skills: A list of 3-5 key skills required for this career
- industries: A list of 1-2 relevant industries

You MUST respond with only a valid JSON array of objects matching the CareerOption schema. No markdown fences, no explanation, no preamble. Raw JSON only.`,
};
