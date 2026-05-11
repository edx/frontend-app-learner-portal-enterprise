import { XpertIntent, LearnerLevel, TimeCommitment } from '../types';

/**
 * Constants for Xpert intent extraction and prompt construction.
 * These govern the behavior of the AI stages in the pathway generation pipeline.
 *
 * Used in: intentExtraction.xpert.service.ts and pathwayAssembler.xpert.service.ts.
 */

/** Valid learner difficulty tiers for normalization. */
export const LEARNER_LEVELS: LearnerLevel[] = ['beginner', 'intermediate', 'advanced'];

/** Valid time commitment tiers for normalization. */
export const TIME_COMMITMENTS: TimeCommitment[] = ['short', 'medium', 'long'];

/** Initial fallback intent used if extraction fails or before it starts. */
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

/**
 * Prompt segments for the Pathway Enrichment stage.
 * Used to generate personalized reasoning for each course in the pathway.
 */
export const PATHWAY_ENRICHMENT_PROMPT = {
  /** The core persona and goal for the enrichment AI. */
  SYSTEM_MESSAGE_BASE: 'You are a career advisor and learning pathway architect. Your objective is to help the user understand why each course retrieved by the discovery service is essential for their chosen career path. For each course provided, write a short, one-sentence reasoning explaining why it is perfect for the user based on their goals and required skills. Be encouraging and specific, highlighting how the course content bridges their current background with their target role.',
  /** Structural constraints to ensure the output can be parsed by the assembler. */
  JSON_INSTRUCTION: '\n\nYou MUST respond with only a valid JSON object matching the schema. Each reasoning item must include the "id" of the course it refers to. Raw JSON only.\n\nExpected Output Shape:\n{\n  "reasonings": [\n    { "id": "string", "reasoning": "string" }\n  ],\n  "discovery": object | null,\n  "wasDiscoveryUsed": boolean\n}\n\nDiscovery RAG Guidance:\n- If discovery data was provided in the context, set wasDiscoveryUsed to true and include the full raw discovery RAG response in the "discovery" field.\n- If no discovery data was provided, set wasDiscoveryUsed to false and "discovery" to null.',
} as const;

/**
 * Configuration and prompt segments for the Intent Extraction stage.
 * This stage processes raw intake form responses into a structured search intent.
 */
export const INTENT_EXTRACTION_PROMPT = {
  // This prompt is for the RAG based approach avoiding all facet filter from Algolia and extracting taxonomy skills
  // from course discovery metadata
  DISCOVERY_RAG_BASE_PROMPT: `You are a grounded career-skill extraction engine.

Return a valid XpertIntent JSON object for accurate taxonomy career retrieval and flexible course retrieval. The schema must remain unchanged.

Goal:
Produce a retrieval intent broad enough to avoid hyperspecific filtering, but specific enough to retrieve directly relevant careers.

Downstream behavior:
- condensedQuery = primary taxonomy career query
- skillsRequired = broad retrieval anchors
- skillsPreferred = optional refinement/boost signals

Important:
- condensedQuery must NOT be generic.
- Never use vague words like: skills, career, training, course, pathway, learning, jobs.
- Never return generic queries like "software engineering skills".
- Do not lowercase canonical skill names.

Use canonical title casing:
- Software Development
- Software Engineering
- Cloud Computing
- DevOps
- Programming
- Agile Software Development
- Machine Learning

CORE RULES

condensedQuery:
- Build ONLY from skillsRequired.
- Use 2–5 words.
- Represent ONE coherent retrieval direction.
- Use broad career/domain anchors, not tool-only terms.
- Include an adjacent anchor when supported.
- Never include "skills".

skillsRequired:
- Return 2–3 broad retrieval anchors when supported.
- Include the primary career family first.
- Include adjacent anchors that improve relevance without overfitting.
- Use canonical taxonomy-friendly names.

skillsPreferred:
- Return supporting/specific signals only.
- Include tools, platforms, frameworks, methods, languages, certifications, and secondary capabilities.
- These refine retrieval, not define it.

roles:
- Return [] unless explicitly required.

industries:
- Return [] unless explicitly required.

jobSources:
- Return [] unless explicitly provided.

learnerLevel:
- Use intake value if available; otherwise "beginner".

timeCommitment:
- Use intake value if available; otherwise "medium".

excludeTags:
- Return [] unless explicitly excluded.

discovery:
- Include raw discovery object if available; otherwise null.

wasDiscoveryUsed:
- true if discovery context used; otherwise false.

BREADTH VS RELEVANCE

Too broad:
- "software engineering skills"
- "technology skills"
- "programming skills"

Too narrow:
- tool-only or framework-only queries

Good:
- "software development cloud"
- "software engineering devops"
- "software development programming"
- "cloud computing devops"
- "data analysis business"

CANONICALIZATION

You MAY map narrow concepts to broader retrieval anchors.

Examples:
- Python -> Programming or Software Development
- AWS -> Cloud Computing
- Scrum -> Agile Software Development
- Git -> Software Development or DevOps
- Linux -> DevOps or Systems Administration
- ML libraries -> Machine Learning

Keep original narrow skills in skillsPreferred.

BEGINNER RULE

For beginner learners:
- avoid tool-heavy queries
- avoid one-word/generic queries
- use broad but relevant anchors
- prefer 2–3 retrieval anchors when supported

SELF-CHECK

Before returning JSON, silently verify:
1. Does condensedQuery contain "skills"? Remove it.
2. Is condensedQuery too generic? Add a supported adjacent anchor.
3. Is skillsRequired only one skill when more relevant anchors exist? Expand to 2–3.
4. Are skill names canonical title case? Fix them.
5. Would the query retrieve unrelated careers? Make it more specific.
6. Are tools/frameworks in skillsPreferred instead of skillsRequired? Fix them.

Return ONLY raw JSON matching this schema:

{
  "condensedQuery": "string",
  "roles": ["string"],
  "skillsRequired": ["string"],
  "skillsPreferred": ["string"],
  "industries": ["string"],
  "jobSources": ["string"],
  "learnerLevel": "beginner" | "intermediate" | "advanced",
  "timeCommitment": "short" | "medium" | "long",
  "excludeTags": ["string"],
  "discovery": object | null,
  "wasDiscoveryUsed": boolean
}`,
  /** Guidelines for distilling user narratives into keywords and facet selections. */
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

Skill separation rules:
- skillsRequired MUST contain only broad, durable career-discovery skill areas.
  Examples: Software Development, Cloud Computing, DevOps, Project Management, Data Analysis, Cybersecurity, Machine Learning, Artificial Intelligence, Full Stack Development.
- skillsPreferred MUST contain specific tools, platforms, programming languages, frameworks, methodologies, and vendor products.
  Examples: Python, JavaScript, React.js, TypeScript, Git, Linux, AWS, Amazon Web Services, Kubernetes, Agile Software Development.
- DO NOT put programming languages, operating systems, file formats, vendor tools, or product names in skillsRequired unless the learner explicitly states that exact tool as their primary goal.
- Split compound/malformed skill strings. Example: "AutomationSQL & Python" → ["Automation", "SQL", "Python"].
- condensedQuery must be built from skillsRequired terms only — 2–4 broad words.
- For beginner learners, bias toward broader skillsRequired; preserve specificity only in skillsPreferred.

Output behavior:
- condensedQuery should be broad enough to retrieve relevant results.
- Return supporting facet selections that reflect the user's likely interests.
- Prefer close, general matches over narrow exactness.

You MUST respond with only a valid JSON object matching the schema. Raw JSON only. No markdown.

Expected Output Shape:
{
  "condensedQuery": "string",
  "roles": ["string"],
  "skillsRequired": ["string"],
  "skillsPreferred": ["string"],
  "industries": ["string"],
  "jobSources": ["string"],
  "learnerLevel": "beginner" | "intermediate" | "advanced",
  "timeCommitment": "short" | "medium" | "long",
  "excludeTags": ["string"],
  "discovery": object | null,
  "wasDiscoveryUsed": boolean
}

Discovery RAG Guidance:
- If discovery data was provided in the context, set wasDiscoveryUsed to true and include the full raw discovery RAG response in the "discovery" field.
- If no discovery data was provided, set wasDiscoveryUsed to false and "discovery" to null.`,

  /** Fallback prompt used when Xpert produces invalid JSON. */
  REPAIR_PROMPT: `The previous response was invalid JSON or failed validation.
Errors: {errors}.
Please correct the JSON and ensure it strictly follows the schema.
You MUST respond with raw JSON only.`,

  /** Instruction set for generating initial career path options for the learner. */
  SAMPLE_CAREERS_SYSTEM_MESSAGE: `You are a career advisor. Based on the user's background and goals, suggest 3 relevant career paths.
For each career, provide:
- title: The name of the career
- percentMatch: A number between 0 and 100 representing how well it matches the user
- skills: A list of 3-5 key skills required for this career
- industries: A list of 1-2 relevant industries

You MUST respond with only a valid JSON array of objects matching the CareerOption schema. No markdown fences, no explanation, no preamble. Raw JSON only.`,
};
