import { renderHook, act } from '@testing-library/react';
import { usePathwayFilters, UsePathwayFiltersProps } from '../usePathwayFilters';
import { PathwayCourse } from '../../types';

describe('usePathwayFilters', () => {
  const mockCourses: PathwayCourse[] = [
    {
      id: '1',
      title: 'React Basics',
      reasoning: 'Good for beginners',
      status: 'not_started',
      level: 'Beginner',
      order: 1,
      skills: [],
    },
    {
      id: '2',
      title: 'Advanced Node',
      reasoning: 'For experts',
      status: 'in_progress',
      level: 'Advanced',
      order: 2,
      skills: [],
    },
    {
      id: '3',
      title: 'Python for Data Science',
      reasoning: 'In demand',
      status: 'completed',
      level: 'Intermediate',
      order: 3,
      skills: [],
    },
  ];

  it('initializes with all courses and default filters', () => {
    const { result } = renderHook(() => usePathwayFilters({ courses: mockCourses }));

    expect(result.current.filteredAndSortedCourses).toHaveLength(3);
    expect(result.current.filters.searchQuery).toBe('');
    expect(result.current.filters.statusFilter).toBe('all');
  });

  it('filters by search query (title)', () => {
    const { result } = renderHook(() => usePathwayFilters({ courses: mockCourses }));

    act(() => {
      result.current.handlers.setSearchQuery('react');
    });

    expect(result.current.filteredAndSortedCourses).toHaveLength(1);
    expect(result.current.filteredAndSortedCourses[0].title).toBe('React Basics');
  });

  it('filters by search query (reasoning)', () => {
    const { result } = renderHook(() => usePathwayFilters({ courses: mockCourses }));

    act(() => {
      result.current.handlers.setSearchQuery('experts');
    });

    expect(result.current.filteredAndSortedCourses).toHaveLength(1);
    expect(result.current.filteredAndSortedCourses[0].title).toBe('Advanced Node');
  });

  it('filters by status', () => {
    const { result } = renderHook(() => usePathwayFilters({ courses: mockCourses }));

    act(() => {
      result.current.handlers.setStatusFilter('completed');
    });

    expect(result.current.filteredAndSortedCourses).toHaveLength(1);
    expect(result.current.filteredAndSortedCourses[0].status).toBe('completed');
  });

  it('filters by level', () => {
    const { result } = renderHook(() => usePathwayFilters({ courses: mockCourses }));

    act(() => {
      result.current.handlers.setLevelFilter('Advanced');
    });

    expect(result.current.filteredAndSortedCourses).toHaveLength(1);
    expect(result.current.filteredAndSortedCourses[0].level).toBe('Advanced');
  });

  it('sorts by title descending', () => {
    const { result } = renderHook(() => usePathwayFilters({ courses: mockCourses }));

    act(() => {
      result.current.handlers.setSortKey('title');
      result.current.handlers.setSortOrder('desc');
    });

    expect(result.current.filteredAndSortedCourses[0].title).toBe('React Basics');
    expect(result.current.filteredAndSortedCourses[2].title).toBe('Advanced Node');
  });

  it('sorts by order descending', () => {
    const { result } = renderHook(() => usePathwayFilters({ courses: mockCourses }));

    act(() => {
      result.current.handlers.setSortKey('order');
      result.current.handlers.setSortOrder('desc');
    });

    expect(result.current.filteredAndSortedCourses[0].order).toBe(3);
    expect(result.current.filteredAndSortedCourses[2].order).toBe(1);
  });

  it('handles undefined values in sorting', () => {
    const coursesWithUndefined = [
      ...mockCourses,
      {
        id: '4', title: 'Test', order: undefined as any, status: 'not_started', level: 'Beginner', skills: [],
      },
    ];
    const { result } = renderHook(() => usePathwayFilters(<UsePathwayFiltersProps>{ courses: coursesWithUndefined }));

    act(() => {
      result.current.handlers.setSortKey('order');
    });

    // It should not crash and return 0 for undefined
    expect(result.current.filteredAndSortedCourses).toBeDefined();
  });

  it('resets filters', () => {
    const { result } = renderHook(() => usePathwayFilters({ courses: mockCourses }));

    act(() => {
      result.current.handlers.setSearchQuery('react');
      result.current.handlers.setStatusFilter('completed');
    });

    expect(result.current.filteredAndSortedCourses).toHaveLength(0);

    act(() => {
      result.current.handlers.resetFilters();
    });

    expect(result.current.filteredAndSortedCourses).toHaveLength(3);
    expect(result.current.filters.searchQuery).toBe('');
    expect(result.current.filters.statusFilter).toBe('all');
  });
});
