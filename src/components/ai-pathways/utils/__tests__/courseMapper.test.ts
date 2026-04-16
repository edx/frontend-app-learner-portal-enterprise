import { mapRetrievalHitToSearchCard } from '../courseMapper';
import { CourseRetrievalHit } from '../../types';

describe('courseMapper', () => {
  describe('mapRetrievalHitToSearchCard', () => {
    const baseHit: Partial<CourseRetrievalHit> = {
      objectID: 'course-1',
      title: 'Test Course',
    };

    it('uses card_image_url if present', () => {
      const hit = {
        ...baseHit,
        card_image_url: 'http://card.jpg',
        image_url: 'http://image.jpg',
        original_image_url: 'http://original.jpg',
      } as CourseRetrievalHit;

      const result = mapRetrievalHitToSearchCard(hit);
      expect(result.card_image_url).toBe('http://card.jpg');
    });

    it('falls back to image_url if card_image_url is missing', () => {
      const hit = {
        ...baseHit,
        image_url: 'http://image.jpg',
        original_image_url: 'http://original.jpg',
      } as CourseRetrievalHit;

      const result = mapRetrievalHitToSearchCard(hit);
      expect(result.card_image_url).toBe('http://image.jpg');
    });

    it('falls back to original_image_url if others are missing', () => {
      const hit = {
        ...baseHit,
        original_image_url: 'http://original.jpg',
      } as CourseRetrievalHit;

      const result = mapRetrievalHitToSearchCard(hit);
      expect(result.card_image_url).toBe('http://original.jpg');
    });

    it('results in undefined if no image URL is present', () => {
      const hit = { ...baseHit } as CourseRetrievalHit;
      const result = mapRetrievalHitToSearchCard(hit);
      expect(result.card_image_url).toBeUndefined();
    });
  });
});
