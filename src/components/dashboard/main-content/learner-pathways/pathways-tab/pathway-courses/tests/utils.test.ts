import { getDisplayedPathwayCourses } from '../utils';
import { PATHWAY_COURSES_STUB } from '../fixtures';
import type { PathwayCourse } from '../../state';

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

describe('PATHWAY_COURSES_STUB', () => {
  it('never fabricates completed or in_progress status', () => {
    PATHWAY_COURSES_STUB.forEach((course) => {
      expect(course.status).toBe('not_started');
    });
  });
});
