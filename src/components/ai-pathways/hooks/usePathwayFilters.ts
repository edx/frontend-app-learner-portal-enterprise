import { useState, useMemo } from 'react';
import type { PathwayCourse, CourseStatus } from '../services/pathways.types';

export type SortKey = 'order' | 'title' | 'status' | 'level';
export type SortOrder = 'asc' | 'desc';

export interface UsePathwayFiltersProps {
  courses: PathwayCourse[];
}

/**
 * Custom hook to manage searching, filtering, and sorting for pathway courses.
 *
 * @param {UsePathwayFiltersProps} props - The initial set of courses to filter.
 * @returns {Object} - An object containing filtered/sorted courses and handlers.
 */
export const usePathwayFilters = ({ courses }: UsePathwayFiltersProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<CourseStatus | 'all'>('all');
  const [levelFilter, setLevelFilter] = useState<string | 'all'>('all');
  const [sortKey, setSortKey] = useState<SortKey>('order');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  const filteredAndSortedCourses = useMemo(() => {
    let result = [...courses];

    // 1. Filter by Search Query (Title or Reasoning)
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (course) => course.title.toLowerCase().includes(query)
          || (course.reasoning?.toLowerCase().includes(query) ?? false),
      );
    }

    // 2. Filter by Status
    if (statusFilter !== 'all') {
      result = result.filter((course) => course.status === statusFilter);
    }

    // 3. Filter by Level
    if (levelFilter !== 'all') {
      result = result.filter((course) => course.level.toLowerCase() === levelFilter.toLowerCase());
    }

    // 4. Sort
    result.sort((a, b) => {
      const aValue = a[sortKey];
      const bValue = b[sortKey];

      if (aValue === undefined || bValue === undefined) { return 0; }

      let comparison = 0;
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        comparison = aValue.localeCompare(bValue);
      } else {
        comparison = (aValue as number) - (bValue as number);
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [courses, searchQuery, statusFilter, levelFilter, sortKey, sortOrder]);

  const resetFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setLevelFilter('all');
    setSortKey('order');
    setSortOrder('asc');
  };

  return {
    filteredAndSortedCourses,
    filters: {
      searchQuery,
      statusFilter,
      levelFilter,
      sortKey,
      sortOrder,
    },
    handlers: {
      setSearchQuery,
      setStatusFilter,
      setLevelFilter,
      setSortKey,
      setSortOrder,
      resetFilters,
    },
  };
};
