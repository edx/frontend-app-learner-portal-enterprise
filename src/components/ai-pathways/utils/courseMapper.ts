import { CourseRetrievalHit } from '../types';

/**
 * Maps a raw Algolia CourseRetrievalHit into the shape expected by SearchCourseCard.
 * While SearchCourseCard uses camelCaseObject internally, this mapper ensures
 * that fallback logic for images and other fields aligns with the requirements.
 */
export const mapRetrievalHitToSearchCard = (hit: CourseRetrievalHit) => {
  // We return the raw hit but can augment it if needed.
  // SearchCourseCard expects snake_case because it calls camelCaseObject(hit).
  // Wait, if it calls camelCaseObject(hit), it expects the input to be snake_case.
  // The Algolia hit is already snake_case.

  return {
    ...hit,
    // Prefer card image fallback order: card_image_url, image_url, original_image_url.
    // Since SearchCourseCard looks at cardImageUrl then originalImageUrl,
    // we set card_image_url to the best available image.
    card_image_url: hit.card_image_url || hit.image_url || hit.original_image_url,
  };
};
