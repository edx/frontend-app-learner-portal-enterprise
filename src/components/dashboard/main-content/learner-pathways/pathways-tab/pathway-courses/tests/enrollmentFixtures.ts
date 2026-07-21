import type { NormalizedEnrollment } from '../resolvePathwayCourses';

export const inProgressMatch: NormalizedEnrollment = {
  courseKey: 'corporate-finance',
  courseRunId: 'course-v1:edX+CF+2024',
  courseRunStatus: 'in_progress',
  isEnrollmentActive: true,
  isRevoked: false,
  created: '2026-01-10T00:00:00Z',
  linkToCourse: 'https://learning.edx.org/course/course-v1:edX+CF+2024/resume',
  linkToCertificate: null,
};

export const upcomingMatch: NormalizedEnrollment = {
  ...inProgressMatch,
  courseRunId: 'course-v1:edX+CF+2024u',
  courseRunStatus: 'upcoming',
};

export const savedForLaterMatch: NormalizedEnrollment = {
  ...inProgressMatch,
  courseRunId: 'course-v1:edX+CF+2024s',
  courseRunStatus: 'saved_for_later',
};

export const completedWithCertificateMatch: NormalizedEnrollment = {
  courseKey: 'financial-analysis-evaluation',
  courseRunId: 'course-v1:edX+FA+2024',
  courseRunStatus: 'completed',
  isEnrollmentActive: true,
  isRevoked: false,
  created: '2026-02-01T00:00:00Z',
  linkToCourse: 'https://learning.edx.org/course/course-v1:edX+FA+2024/home',
  linkToCertificate: 'https://courses.edx.org/certificates/abc123',
};

export const completedWithoutCertificateMatch: NormalizedEnrollment = {
  ...completedWithCertificateMatch,
  courseRunId: 'course-v1:edX+FA+2024b',
  linkToCertificate: null,
};

export const inProgressMatchNoLink: NormalizedEnrollment = {
  ...inProgressMatch,
  courseRunId: 'course-v1:edX+CF+2024n',
  linkToCourse: '',
};

export const inactiveMatch: NormalizedEnrollment = {
  ...inProgressMatch,
  courseRunId: 'course-v1:edX+CF+2024i',
  isEnrollmentActive: false,
};

export const revokedMatch: NormalizedEnrollment = {
  ...inProgressMatch,
  courseRunId: 'course-v1:edX+CF+2024r',
  isRevoked: true,
};

/** Same courseRunId as `inProgressMatch` but a different top-level courseKey — must be ignored. */
export const sameRunIdDifferentCourseKeyDecoy: NormalizedEnrollment = {
  ...inProgressMatch,
  courseKey: 'some-other-course',
};

/** Matching title semantics aside, matching must be by courseKey only. */
export const matchingTitleDifferentCourseKeyDecoy: NormalizedEnrollment = {
  ...inProgressMatch,
  courseKey: 'unrelated-key',
};

/** Older, non-completed match for the tie-break/"completed wins" scenarios. */
export const olderInProgressForFinance: NormalizedEnrollment = {
  courseKey: 'financial-analysis-evaluation',
  courseRunId: 'course-v1:edX+FA+old',
  courseRunStatus: 'in_progress',
  isEnrollmentActive: true,
  isRevoked: false,
  created: '2025-01-01T00:00:00Z',
  linkToCourse: 'https://learning.edx.org/old',
  linkToCertificate: null,
};

/** Newer, completed match for the same courseKey as `olderInProgressForFinance`. */
export const newerCompletedForFinance: NormalizedEnrollment = {
  ...completedWithCertificateMatch,
  created: '2026-06-01T00:00:00Z',
};
