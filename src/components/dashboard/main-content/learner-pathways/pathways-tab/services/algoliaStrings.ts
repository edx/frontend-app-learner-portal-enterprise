/**
 * Small, generic string helpers shared across the Learner Pathways Algolia services
 * (career retrieval, course retrieval, catalog skill translation). Kept deliberately
 * tiny and domain-agnostic — anything with career/course-specific meaning stays in its
 * owning service, not here.
 */

/** Trims a possibly-nullish string, collapsing null/undefined to `''`. */
export const normalizeString = (value?: string | null): string => (value || '').trim();

/**
 * True for compound-artifact skill names like "SQL & Python" or "Excel + Tableau" —
 * parsing artifacts, not real skills, and excluded from retrieval on both the career
 * and course paths.
 */
export const isMalformedCompound = (name: string): boolean => name.includes(' & ') || name.includes(' + ');

/** Quotes and escapes a value for safe interpolation into an Algolia filter expression. */
export const quoteFacetValue = (value: string): string => `"${value.replace(/"/g, '\\"')}"`;
