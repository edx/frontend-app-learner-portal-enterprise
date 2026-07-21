import { resolvePathwayCourses } from '../resolvePathwayCourses';
import type { PathwayCourse } from '../../state';
import type { NormalizedEnrollment } from '../resolvePathwayCourses';
import {
  completedWithCertificateMatch,
  completedWithoutCertificateMatch,
  inactiveMatch,
  inProgressMatch,
  inProgressMatchNoLink,
  matchingTitleDifferentCourseKeyDecoy,
  newerCompletedForFinance,
  olderInProgressForFinance,
  revokedMatch,
  sameRunIdDifferentCourseKeyDecoy,
  savedForLaterMatch,
  upcomingMatch,
} from './enrollmentFixtures';

const ENTERPRISE_SLUG = 'test-enterprise';

const buildCourse = (overrides: Partial<PathwayCourse> = {}): PathwayCourse => ({
  courseKey: 'corporate-finance',
  title: 'Introduction to Corporate Finance',
  status: 'not_started',
  ...overrides,
});

const resolveOne = (enrollments: NormalizedEnrollment[], course: PathwayCourse = buildCourse()) => {
  const { courses } = resolvePathwayCourses({
    pathwayCourses: [course],
    enrollments,
    enterpriseSlug: ENTERPRISE_SLUG,
  });
  return courses[0];
};

describe('resolvePathwayCourses', () => {
  it('A1: derives not_started + view_course when no enrollment matches the courseKey', () => {
    const row = resolveOne([]);
    expect(row.status).toBe('not_started');
    expect(row.action).toEqual({
      kind: 'view_course',
      destination: `/${ENTERPRISE_SLUG}/course/corporate-finance`,
      isExternal: false,
    });
  });

  it.each([
    ['in_progress', inProgressMatch],
    ['upcoming', upcomingMatch],
    ['saved_for_later', savedForLaterMatch],
  ])('A2-4: derives in_progress + continue for an active, non-revoked %s match', (_label, match) => {
    const row = resolveOne([match]);
    expect(row.status).toBe('in_progress');
    expect(row.action.kind).toBe('continue');
    expect(row.action.destination).toBe(match.linkToCourse);
    expect(row.action.isExternal).toBe(false);
  });

  it('A5: derives completed + view_certificate for a completed match with a certificate', () => {
    const course = buildCourse({ courseKey: 'financial-analysis-evaluation', title: 'Financial Analysis & Evaluation' });
    const row = resolveOne([completedWithCertificateMatch], course);
    expect(row.status).toBe('completed');
    expect(row.action).toEqual({
      kind: 'view_certificate',
      destination: completedWithCertificateMatch.linkToCertificate,
      isExternal: true,
    });
  });

  it('A6: derives completed + view_course fallback when a completed match has no certificate', () => {
    const course = buildCourse({ courseKey: 'financial-analysis-evaluation', title: 'Financial Analysis & Evaluation' });
    const row = resolveOne([completedWithoutCertificateMatch], course);
    expect(row.status).toBe('completed');
    expect(row.action.kind).toBe('view_course');
    expect(row.action.destination).toBe(`/${ENTERPRISE_SLUG}/course/financial-analysis-evaluation`);
  });

  it('A7: falls back to a safe view_course when an in_progress match has no linkToCourse', () => {
    const row = resolveOne([inProgressMatchNoLink]);
    expect(row.status).toBe('in_progress');
    expect(row.action.kind).toBe('view_course');
    expect(row.action.destination).toBe(`/${ENTERPRISE_SLUG}/course/corporate-finance`);
  });

  it('A8: ignores an inactive enrollment and derives not_started', () => {
    const row = resolveOne([inactiveMatch]);
    expect(row.status).toBe('not_started');
    expect(row.action.kind).toBe('view_course');
  });

  it('A9: ignores a revoked enrollment and derives not_started', () => {
    const row = resolveOne([revokedMatch]);
    expect(row.status).toBe('not_started');
    expect(row.action.kind).toBe('view_course');
  });

  it('A10: ignores an enrollment whose courseRunId matches but whose top-level courseKey differs', () => {
    const row = resolveOne([sameRunIdDifferentCourseKeyDecoy]);
    expect(row.status).toBe('not_started');
  });

  it('A11: ignores an enrollment with a matching title but a different courseKey', () => {
    const row = resolveOne([matchingTitleDifferentCourseKeyDecoy]);
    expect(row.status).toBe('not_started');
  });

  it('A12: enrollments for unrelated courseKeys cannot affect the resolved result', () => {
    const row = resolveOne([sameRunIdDifferentCourseKeyDecoy, matchingTitleDifferentCourseKeyDecoy]);
    expect(row.status).toBe('not_started');
    expect(row.action.kind).toBe('view_course');
  });

  it('A13: resolves deterministically when several enrollments match the same courseKey, regardless of input order', () => {
    const course = buildCourse({ courseKey: 'financial-analysis-evaluation', title: 'Financial Analysis & Evaluation' });
    const forward = resolveOne([olderInProgressForFinance, newerCompletedForFinance], course);
    const reversed = resolveOne([newerCompletedForFinance, olderInProgressForFinance], course);
    expect(forward).toEqual(reversed);
    expect(forward.status).toBe('completed');
  });

  it('A14: prefers a completed match over a non-completed match when both qualify', () => {
    const course = buildCourse({ courseKey: 'financial-analysis-evaluation', title: 'Financial Analysis & Evaluation' });
    const row = resolveOne([olderInProgressForFinance, newerCompletedForFinance], course);
    expect(row.status).toBe('completed');
    expect(row.action.kind).toBe('view_certificate');
  });

  it('A15: does not discard a certificate-bearing completed record during multi-match selection', () => {
    const course = buildCourse({ courseKey: 'financial-analysis-evaluation', title: 'Financial Analysis & Evaluation' });
    const row = resolveOne([olderInProgressForFinance, newerCompletedForFinance], course);
    expect(row.action.destination).toBe(newerCompletedForFinance.linkToCertificate);
  });

  it('A16: does not mutate the source enrollments array or its elements', () => {
    const enrollments = [olderInProgressForFinance, newerCompletedForFinance];
    const snapshot = JSON.parse(JSON.stringify(enrollments));
    const course = buildCourse({ courseKey: 'financial-analysis-evaluation', title: 'Financial Analysis & Evaluation' });
    resolvePathwayCourses({ pathwayCourses: [course], enrollments, enterpriseSlug: ENTERPRISE_SLUG });
    expect(enrollments).toEqual(snapshot);
  });

  it('A17: uses the prescribed fallback destination when a matched enrollment link is blank', () => {
    const row = resolveOne([inProgressMatchNoLink]);
    expect(row.action.destination).toBeTruthy();
    expect(row.action.destination).not.toBe('');
    expect(row.action.destination).not.toBe('#');
  });

  it('A18: ignores the persisted/stub course.status and derives status purely from enrollments', () => {
    const course = buildCourse({ status: 'completed' });
    const row = resolveOne([], course);
    expect(row.status).toBe('not_started');
  });

  it('A19: does not mutate the input PathwayCourse objects', () => {
    const course = buildCourse({ status: 'completed' });
    const snapshot = { ...course };
    resolvePathwayCourses({ pathwayCourses: [course], enrollments: [], enterpriseSlug: ENTERPRISE_SLUG });
    expect(course).toEqual(snapshot);
  });

  it('A20: returns aggregate progress that matches the resolved rows exactly', () => {
    const courses = [
      buildCourse({ courseKey: 'financial-analysis-evaluation', title: 'Financial Analysis & Evaluation' }),
      buildCourse({ courseKey: 'corporate-finance', title: 'Introduction to Corporate Finance' }),
      buildCourse({ courseKey: 'advanced-excel-financial-analysis', title: 'Advanced Excel' }),
      buildCourse({ courseKey: 'investment-banking-ma-transactions', title: 'Investment Banking' }),
    ];
    const { courses: resolved, progress } = resolvePathwayCourses({
      pathwayCourses: courses,
      enrollments: [completedWithCertificateMatch, inProgressMatch],
      enterpriseSlug: ENTERPRISE_SLUG,
    });

    expect(progress).toEqual({
      completed: resolved.filter((c) => c.status === 'completed').length,
      inProgress: resolved.filter((c) => c.status === 'in_progress').length,
      upcoming: resolved.filter((c) => c.status === 'not_started').length,
      totalCourses: resolved.length,
    });
    expect(progress.totalCourses).toBe(courses.length);
  });
});
