import { renderHook, act } from '@testing-library/react';
import { usePathwayDetail } from '../usePathwayDetail';
import { PathwayCourse } from '../../types';

describe('usePathwayDetail', () => {
  const mockCourse: PathwayCourse = {
    id: '1',
    title: 'Test Course',
    reasoning: 'test',
    status: 'not_started',
    level: 'Beginner',
    order: 1,
    skills: [],
  };

  it('initializes with default values', () => {
    const { result } = renderHook(() => usePathwayDetail());

    expect(result.current.selectedCourse).toBeNull();
    expect(result.current.isDetailOpen).toBe(false);
  });

  it('opens detail with a course', () => {
    const { result } = renderHook(() => usePathwayDetail());

    act(() => {
      result.current.openDetail(mockCourse);
    });

    expect(result.current.selectedCourse).toEqual(mockCourse);
    expect(result.current.isDetailOpen).toBe(true);
  });

  it('closes detail and clears course', () => {
    const { result } = renderHook(() => usePathwayDetail());

    act(() => {
      result.current.openDetail(mockCourse);
    });
    expect(result.current.isDetailOpen).toBe(true);

    act(() => {
      result.current.closeDetail();
    });

    expect(result.current.isDetailOpen).toBe(false);
    expect(result.current.selectedCourse).toBeNull();
  });
});
