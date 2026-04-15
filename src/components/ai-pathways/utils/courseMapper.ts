import { CourseRetrievalHit } from '../types';

/**
 * @typedef {Object} CourseRetrievalHit
 * @property {string} title - Course title
 * @property {string} [card_image_url] - Primary card image URL
 * @property {string} [image_url] - Secondary image URL
 * @property {string} [original_image_url] - Fallback image URL
 */

/**
 * Maps Algolia retrieval hits into UI-ready course cards.
 *
 * @param {CourseRetrievalHit} hit - Raw Algolia search result (snake_case)
 * @returns {CourseRetrievalHit} UI-ready course card data with card_image_url set
 *
 * @remarks
 * Pipeline: retrieval → mapping → UI
 *
 * Dependencies:
 * - Algolia search results (CourseRetrievalHit)
 * - SearchCourseCard component contract
 *
 * Notes:
 * - We preserve snake_case because downstream SearchCourseCard applies camelCaseObject()
 * - Augments hit with card_image_url based on available image fields
 *   (preferring card_image_url, then image_url, then original_image_url)
 */
export const mapRetrievalHitToSearchCard = (hit: CourseRetrievalHit) => ({
  ...hit,
  card_image_url: hit.card_image_url || hit.image_url || hit.original_image_url,
});
