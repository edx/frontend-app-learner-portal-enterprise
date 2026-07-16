import { derivePathwayProgress, getDisplayedPathwayCourses } from '../utils';
import { PATHWAY_COURSES_STUB } from '../fixtures';
import type { PathwayCourse } from '../../state';

describe('derivePathwayProgress', () => {
  it('returns all zeros for an empty course list', () => {
    expect(derivePathwayProgress([])).toEqual({
      completed: 0,
      inProgress: 0,
      upcoming: 0,
      totalCourses: 0,
    });
  });

  it('counts all-completed courses correctly', () => {
    const courses: PathwayCourse[] = [
      { courseKey: 'a', title: 'A', status: 'completed' },
      { courseKey: 'b', title: 'B', status: 'completed' },
    ];

    expect(derivePathwayProgress(courses)).toEqual({
      completed: 2,
      inProgress: 0,
      upcoming: 0,
      totalCourses: 2,
    });
  });

  it('counts a mix of statuses correctly', () => {
    const courses: PathwayCourse[] = [
      { courseKey: 'a', title: 'A', status: 'completed' },
      { courseKey: 'b', title: 'B', status: 'in_progress' },
      { courseKey: 'c', title: 'C', status: 'not_started' },
      { courseKey: 'd', title: 'D', status: 'not_started' },
    ];

    expect(derivePathwayProgress(courses)).toEqual({
      completed: 1,
      inProgress: 1,
      upcoming: 2,
      totalCourses: 4,
    });
  });
});

describe('getDisplayedPathwayCourses', () => {
  it('returns the fixture stub when store courses are empty', () => {
    expect(getDisplayedPathwayCourses([])).toBe(PATHWAY_COURSES_STUB);
  });

  it('returns store courses verbatim when populated, leaving the fixture untouched', () => {
    const storeCourses: PathwayCourse[] = [
      { courseKey: 'custom', title: 'Custom Store Course', status: 'not_started' },
    ];

    const result = getDisplayedPathwayCourses(storeCourses);

    expect(result).toBe(storeCourses);
    expect(result).not.toEqual(PATHWAY_COURSES_STUB);
  });
});
