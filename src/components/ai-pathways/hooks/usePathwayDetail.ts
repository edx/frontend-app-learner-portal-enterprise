import { useState, useCallback } from 'react';
import type { PathwayCourse } from '../types';

/**
 * Hook to manage the visibility and data state for the course detail view.
 *
 * This hook handles the logic for selecting a specific course from the pathway
 * and managing its detailed display (typically within a modal or drawer).
 */
export const usePathwayDetail = () => {
  const [selectedCourse, setSelectedCourse] = useState<PathwayCourse | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  /**
   * Opens the detail view for a specific course.
   *
   * @param course - The course to display details for.
   */
  const openDetail = useCallback((course: PathwayCourse) => {
    setSelectedCourse(course);
    setIsDetailOpen(true);
  }, []);

  /**
   * Closes the detail view and clears the selected course.
   */
  const closeDetail = useCallback(() => {
    setIsDetailOpen(false);
    // Use a slight timeout or defer clearing the course if we want to avoid
    // content jumping during the closing animation of a modal/collapse.
    // For now, simple state reset is fine.
    setSelectedCourse(null);
  }, []);

  return {
    selectedCourse,
    isDetailOpen,
    openDetail,
    closeDetail,
  };
};
