import { formatExportTimestamp } from '../dateUtils';

describe('dateUtils', () => {
  describe('formatExportTimestamp', () => {
    it('formats a date correctly', () => {
      const date = new Date(2023, 0, 15, 14, 30, 45); // Jan 15, 2023, 14:30:45
      expect(formatExportTimestamp(date)).toBe('2023-01-15_14-30-45');
    });

    it('uses current date if none provided', () => {
      const now = new Date();
      // Using a small buffer to avoid timing issues
      const result = formatExportTimestamp();
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}$/);

      const year = now.getFullYear();
      expect(result.startsWith(year.toString())).toBe(true);
    });

    it('pads single digit values with zeros', () => {
      const date = new Date(2023, 4, 5, 6, 7, 8); // May 5, 2023, 06:07:08
      expect(formatExportTimestamp(date)).toBe('2023-05-05_06-07-08');
    });
  });
});
