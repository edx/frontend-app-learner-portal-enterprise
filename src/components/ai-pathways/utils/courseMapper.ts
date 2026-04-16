import { CourseRetrievalHit } from '../types';

/**
 * Utility to map raw Algolia course hits into the format expected by UI components.
 *
 * Pipeline context: Executed during the mapping phase, immediately after retrieval
 * and before rendering. It ensures consistent property naming for image URLs
 * across different content types.
 */

/**
 * Normalizes image URL fields in an Algolia retrieval hit.
 *
 * Downstream components (like SearchCourseCard) expect a 'card_image_url'.
 * This mapper ensures that field is populated using the best available source.
 *
 * @param hit The raw record retrieved from the Algolia catalog index.
 * @returns An augmented hit object with a guaranteed 'card_image_url' (if any image exists).
 * @remarks We preserve snake_case keys here because the shared SearchCourseCard
 * utility handles camel-casing internally.
 */
export const mapRetrievalHitToSearchCard = (hit: CourseRetrievalHit) => ({
  ...hit,
  card_image_url: hit.card_image_url || hit.image_url || hit.original_image_url,
});
