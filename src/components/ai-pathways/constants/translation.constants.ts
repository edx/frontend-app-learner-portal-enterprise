/**
 * Constants for mapping taxonomy outputs to Algolia catalog fields.
 *
 * Used in: translation layer (intent → retrieval)
 * Extend when new taxonomy terms need normalization.
 */

export const CATALOG_ALIAS_MAP: Record<string, string> = {
  // --- Skills: Programming Languages & Tech ---
  python: 'Python (Programming Language)',
  javascript: 'JavaScript (Programming Language)',
  sql: 'SQL (Programming Language)',

  // --- Skills: Software Engineering Domains ---
  'front end': 'Front End (Software Engineering)',
  frontend: 'Front End (Software Engineering)',
};
