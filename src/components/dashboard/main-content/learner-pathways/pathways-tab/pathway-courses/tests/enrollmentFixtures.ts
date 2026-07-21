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

/**
 * Older completed match WITH a certificate, for the same courseKey as
 * `newerCompletedWithoutCertificateForFinance` — both are completed, so the
 * certificate-preference tie-break (not the completed-vs-non-completed one) must decide.
 */
export const olderCompletedWithCertificateForFinance: NormalizedEnrollment = {
  ...completedWithCertificateMatch,
  courseRunId: 'course-v1:edX+FA+cert-old',
  created: '2025-06-01T00:00:00Z',
};

/** Newer completed match WITHOUT a certificate, for the same courseKey as above. */
export const newerCompletedWithoutCertificateForFinance: NormalizedEnrollment = {
  ...completedWithCertificateMatch,
  courseRunId: 'course-v1:edX+FA+cert-new',
  created: '2026-06-01T00:00:00Z',
  linkToCertificate: null,
};

/** Older in_progress match — same status as its sibling below, different `created`. */
export const olderInProgressMatch: NormalizedEnrollment = {
  ...inProgressMatch,
  courseRunId: 'course-v1:edX+CF+older',
  created: '2025-01-01T00:00:00Z',
};

/** Newer in_progress match for the same courseKey as `olderInProgressMatch`. */
export const newerInProgressMatch: NormalizedEnrollment = {
  ...inProgressMatch,
  courseRunId: 'course-v1:edX+CF+newer',
  created: '2026-06-01T00:00:00Z',
};

/**
 * Two in_progress matches with identical `created` timestamps, differing only by
 * `courseRunId` — exercises the final, deterministic `courseRunId.localeCompare` tie-break.
 */
export const tiedCreatedMatchA: NormalizedEnrollment = {
  ...inProgressMatch,
  courseRunId: 'course-v1:edX+CF+tie-a',
  created: '2026-03-01T00:00:00Z',
};

export const tiedCreatedMatchB: NormalizedEnrollment = {
  ...inProgressMatch,
  courseRunId: 'course-v1:edX+CF+tie-b',
  created: '2026-03-01T00:00:00Z',
};

/** A `courseRunStatus` outside the recognized COURSE_STATUSES values. */
export const unknownStatusMatch: NormalizedEnrollment = {
  ...inProgressMatch,
  courseRunId: 'course-v1:edX+CF+unknown',
  courseRunStatus: 'archived',
};
