import { getPrimaryLanguageSubtag } from '@edx/frontend-platform/i18n';
import { features } from '../../config';

/**
 * A fluent builder for constructing structured Algolia-compatible filter strings.
 *
 * This class helps compose complex query filters using `AND`, `OR`, negation (`andRaw`),
 * and conditional logic like `filterByCatalogUuids()` or `excludeVideoContentIfFeatureDisabled()`.
 *
 * Useful for dynamic, user-driven search UIs where filters must be assembled programmatically.
 *
 * Example:
 * ```ts
 * const filter = new AlgoliaFilterBuilder()
 *   .and('type', 'course')
 *   .or('level', ['beginner', 'intermediate'])
 *   .andRaw('NOT content_type:video')
 *   .filterByCatalogUuids(['c1', 'c2'])
 *   .build();
 *
 * // Result:
 * // "type:course AND (level:beginner OR level:intermediate) AND NOT
 * // content_type:video AND (enterprise_catalog_uuids:c1 OR enterprise_catalog_uuids:c2)"
 * ```
 *
 * Available methods:
 * - `.and(attribute, value)`
 * - `.or(attribute, values[])`
 * - `.andRaw(clause)`
 * - `.filterByCatalogQueryUuids(...)`
 * - `.filterByCatalogUuids(...)`
 * - `.filterByEnterpriseCustomerUuid(...)`
 * - `.excludeVideoContentIfFeatureDisabled()`
 * - `.build()`
 */

/**
 * Locale codes supported in Pathways MVP are only English and Spanish, with a fallback to
 * English for all unsupported locales. These are mapped to the human-readable name used
 * by the Algolia `language` facet (e.g. "English", "Spanish")
 * - metadata_language: which language this record's title/description text is
 *   in. Every course/program/pathway is indexed once in English by default
 *   (`metadata_language: 'en'`). If a Spanish translation has been pre-computed
 *   for that item, a second, separate record is indexed alongside it with the
 *   translated text and `metadata_language: 'es'`. So a single course can show
 *   up as two Algolia records — one per language its metadata has been
 *   translated into.
 * - language: the actual instructional language of the course content,
 *   stored as an English display name (e.g. "Italian"), and is only populated
 *   for courses, not pathways or programs
 * A course's metadata_language can be 'en' while its language is "Italian" —
 * these are independent and both must be filtered for courses.
 */

const LOCALE_TO_LANGUAGE_FACET_NAME: Record<'en' | 'es', string> = { en: 'English', es: 'Spanish' };
const resolveSupportedLocale = (locale?: string): 'en' | 'es' => (
  getPrimaryLanguageSubtag(locale ?? '')?.toLowerCase() === 'es' ? 'es' : 'en'
);

export default class AlgoliaFilterBuilder {
  private filters: string[] = [];

  /**
   * Adds an AND clause with a single `attribute:value` pair.
   *
   * @param attribute - The name of the attribute to filter on.
   * @param value - The value the attribute must match.
   * @param options - Optional configuration object.
   * @param options.stringify - Whether to quote the value for string-based filters (default: false).
   * @returns The current AlgoliaFilterBuilder instance for chaining.
   *
   * @example
   *   new AlgoliaFilterBuilder().and('type', 'course').build()
   *   // → "type:course"
   */
  and(
    attribute: string,
    value: string,
    options: { stringify?: boolean } = {},
  ) {
    const { stringify = false } = options;

    if (attribute && value) {
      const formatted = stringify
        ? `${attribute}:"${value}"`
        : `${attribute}:${value}`;
      this.filters.push(formatted);
    }

    return this;
  }

  /**
   * Adds an OR group for a single attribute with multiple values.
   *
   * @param attribute - The name of the attribute to filter on (e.g. 'level', 'skill_names').
   * @param values - An array of values to match for the attribute.
   * @param options - Optional configuration object.
   * @param options.stringify - Whether to wrap each value in double quotes (default: false).
   * @returns The current AlgoliaFilterBuilder instance for chaining.
   *
   * @example
   *   new AlgoliaFilterBuilder().or('level', ['beginner', 'intermediate']).build()
   *   // → '(level:beginner OR level:intermediate)'
   *   new AlgoliaFilterBuilder().or('skill_names', ['SQL', 'Agile']).build()
   *   // → '(skill_names:"SQL" OR skill_names:"Agile")'
   */
  or(
    attribute: string,
    values: string[],
    options: { stringify?: boolean } = {},
  ): this {
    const { stringify = false } = options;
    const validValues = values.filter(Boolean);

    if (attribute && validValues.length > 0) {
      const clause = validValues
        .map(value => (stringify ? `${attribute}:"${value}"` : `${attribute}:${value}`))
        .join(' OR ');
      this.filters.push(`(${clause})`);
    }

    return this;
  }

  /**
   * Adds a custom raw clause (e.g., negations, ranges, or advanced syntax).
   *
   * @param clause - A raw filter clause to include as-is.
   * @returns The current AlgoliaFilterBuilder instance for chaining.
   *
   * @example
   *   new AlgoliaFilterBuilder().andRaw('NOT content_type:video').build()
   *   // → "NOT content_type:video"
   */
  andRaw(clause: string) {
    if (clause && clause.trim().length > 0) {
      this.filters.push(clause);
    }
    return this;
  }

  /**
   * Adds a filter using mapped catalog query UUIDs for the given search catalogs.
   *
   * @param searchCatalogs - Array of catalog UUIDs from the search context.
   * @param catalogUuidsToCatalogQueryUuids - Mapping from catalog UUID → query UUID.
   * @returns The current AlgoliaFilterBuilder instance for chaining.
   *
   * @example
   *   const catalogs = ['cat1', 'cat2'];
   *   const mapping = { cat1: 'q1', cat2: 'q2' };
   *   new AlgoliaFilterBuilder().filterByCatalogQueryUuids(catalogs, mapping).build()
   *   // → "(enterprise_catalog_query_uuids:q1 OR enterprise_catalog_query_uuids:q2)"
   */
  filterByCatalogQueryUuids(
    searchCatalogs: string[],
    catalogUuidsToCatalogQueryUuids: Record<string, string>,
  ) {
    const resolvedUuids = searchCatalogs
      .map(catalog => catalogUuidsToCatalogQueryUuids[catalog])
      .filter(Boolean);

    return this.or('enterprise_catalog_query_uuids', resolvedUuids);
  }

  /**
   * Conditionally excludes video content using the `FEATURE_ENABLE_VIDEO_CATALOG` flag.
   * Adds the clause `NOT content_type:video` if the feature is disabled.
   *
   * @returns The current AlgoliaFilterBuilder instance for chaining.
   *
   * @example
   *   new AlgoliaFilterBuilder().excludeVideoContentIfFeatureDisabled().build()
   *   // → "NOT content_type:video" (if feature flag is off)
   *   // → "" (if feature flag is on)
   */
  excludeVideoContentIfFeatureDisabled() {
    if (!features.FEATURE_ENABLE_VIDEO_CATALOG) {
      this.andRaw('NOT content_type:video');
    }
    return this;
  }

  /**
   * Adds a filter for a single enterprise customer UUID.
   *
   * @param uuid - The UUID of the enterprise customer.
   * @returns The current AlgoliaFilterBuilder instance for chaining.
   *
   * @example
   *   new AlgoliaFilterBuilder().filterByEnterpriseCustomerUuid('abc-123').build()
   *   // → "enterprise_customer_uuids:abc-123"
   */
  filterByEnterpriseCustomerUuid(uuid: string) {
    if (uuid) {
      this.and('enterprise_customer_uuids', uuid);
    }
    return this;
  }

  /**
   * Adds a filter for one or more catalog UUIDs.
   *
   * @param uuids - Array of catalog UUIDs to include.
   * @returns The current AlgoliaFilterBuilder instance for chaining.
   *
   * @example
   *   new AlgoliaFilterBuilder().filterByCatalogUuids(['c1', 'c2']).build()
   *   // → "(enterprise_catalog_uuids:c1 OR enterprise_catalog_uuids:c2)"
   */
  filterByCatalogUuids(uuids: string[]) {
    return this.or('enterprise_catalog_uuids', uuids);
  }

  /**
   * Adds a filter for the metadata language.
   *
   * @param locale - The locale code to filter by (e.g. 'en', 'jp').
   * @returns The current AlgoliaFilterBuilder instance for chaining.
   */
  filterByMetadataLanguage(locale: string) {
    if (locale) {
      this.and('metadata_language', locale);
    }
    return this;
  }

  /**
   * Adds a filter for the metadata language, but constrained to only the
   * supported locales in Pathways MVP ('en' and 'es')
   *
   * @param locale - The locale code to filter by.
   * @returns The current AlgoliaFilterBuilder instance for chaining.
   */
  filterPathwaysByMetadataLanguage(locale?: string) {
    return this.and('metadata_language', resolveSupportedLocale(locale));
  }

  /**
  * Adds a filter restricting courses to both the metadata-translation locale and
  * the actual instructional content language.
  *
  * @param locale - The locale code to filter by (e.g. 'en', 'es').
  * @returns The current AlgoliaFilterBuilder instance for chaining.
  */
  filterCoursesByLanguage(locale?: string) {
    const supportedLocale = resolveSupportedLocale(locale);
    return this
      .and('metadata_language', supportedLocale)
      .and('language', LOCALE_TO_LANGUAGE_FACET_NAME[supportedLocale]);
  }

  /**
   * Builds and returns the final Algolia-compatible filter string.
   *
   * @returns A complete filter expression with `AND`-joined clauses.
   *
   * @example
   *   new AlgoliaFilterBuilder()
   *     .and('type', 'course')
   *     .or('level', ['beginner', 'intermediate'])
   *     .andRaw('NOT content_type:video')
   *     .build()
   *   // → "type:course AND (level:beginner OR level:intermediate) AND NOT content_type:video"
   */
  build() {
    return this.filters.join(' AND ');
  }
}
