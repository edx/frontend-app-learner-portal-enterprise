import { getLinkToCourse } from '../../../../../course/data/utils';
import { COURSE_STATUSES } from '../../../../../../constants';
import type { PathwayCourse, PathwayCourseStatus, PathwayProgress } from '../state';

export type PathwayCourseActionKind = 'view_course' | 'continue' | 'view_certificate';

export interface ResolvedPathwayCourseAction {
  kind: PathwayCourseActionKind;
  /** Always a real, non-empty URL — never '#', '', null, or undefined. */
  destination: string;
  isExternal: boolean;
}

export interface ResolvedPathwayCourse extends Omit<PathwayCourse, 'status'> {
  status: PathwayCourseStatus;
  action: ResolvedPathwayCourseAction;
}

/**
 * The subset of a normalized `EnterpriseCourseEnrollment` (see
 * `transformCourseEnrollment`, src/components/app/data/utils.js) this resolver reads.
 * A narrow structural `Pick` rather than the full generated enrollment shape, since
 * this feature only ever needs these fields.
 */
export interface NormalizedEnrollment {
  courseKey: string;
  courseRunId: string;
  courseRunStatus: string;
  isEnrollmentActive: boolean;
  isRevoked: boolean;
  created: string;
  linkToCourse?: string | null;
  linkToCertificate?: string | null;
}

export interface ResolvePathwayCoursesInput {
  pathwayCourses: PathwayCourse[];
  /**
   * Normally an array, but `useEnterpriseCourseEnrollments`'s BFF-path `select` has no
   * fallback on `data.enterpriseCourseEnrollments`, so this can legitimately be
   * `undefined` (observed in production as a `TypeError` here before this was guarded).
   */
  enrollments: NormalizedEnrollment[] | null | undefined;
  enterpriseSlug: string;
}

export interface ResolvePathwayCoursesResult {
  courses: ResolvedPathwayCourse[];
  progress: PathwayProgress;
}

const isNonEmpty = (value: string | null | undefined): value is string => (
  typeof value === 'string' && value.trim().length > 0
);

const buildViewCourseAction = (courseKey: string, enterpriseSlug: string): ResolvedPathwayCourseAction => ({
  kind: 'view_course',
  // Only `key` is passed (no `courseType`/other catalog fields) — getCourseTypeConfig
  // degrades gracefully on a minimal object, falling back to the plain course route.
  destination: getLinkToCourse({ key: courseKey }, enterpriseSlug),
  isExternal: false,
});

const deriveAction = (
  status: PathwayCourseStatus,
  winner: NormalizedEnrollment,
  courseKey: string,
  enterpriseSlug: string,
): ResolvedPathwayCourseAction => {
  if (status === 'completed') {
    if (isNonEmpty(winner.linkToCertificate)) {
      return { kind: 'view_certificate', destination: winner.linkToCertificate, isExternal: true };
    }
    // Completed but no certificate URL yet — safe internal fallback, status stays completed.
    return buildViewCourseAction(courseKey, enterpriseSlug);
  }

  if (status === 'in_progress') {
    if (isNonEmpty(winner.linkToCourse)) {
      return { kind: 'continue', destination: winner.linkToCourse, isExternal: false };
    }
    // In progress but no resume/run URL available — safe internal fallback.
    return buildViewCourseAction(courseKey, enterpriseSlug);
  }

  return buildViewCourseAction(courseKey, enterpriseSlug);
};

/**
 * Maps a realized enrollment's `courseRunStatus` to the Pathway UI's three-state
 * status union. `upcoming` and `saved_for_later` are enrolled-but-not-progressing,
 * so both collapse into `in_progress` per product intent — this UI has no separate
 * "upcoming" row status (the progress summary's "upcoming" label instead reflects
 * `not_started` rows). Any other/unknown value defensively falls back to `not_started`.
 */
const deriveStatus = (courseRunStatus: string): PathwayCourseStatus => {
  if (courseRunStatus === COURSE_STATUSES.completed) {
    return 'completed';
  }
  if (
    courseRunStatus === COURSE_STATUSES.inProgress
    || courseRunStatus === COURSE_STATUSES.upcoming
    || courseRunStatus === COURSE_STATUSES.savedForLater
  ) {
    return 'in_progress';
  }
  return 'not_started';
};

/**
 * Resolves the winning enrollment when several qualifying enrollments share a
 * courseKey (e.g. multiple course runs). Never mutates `candidates`.
 *
 * Precedence: (1) a completed match always wins over a non-completed one; (2) among
 * completed matches, prefer one with a non-empty certificate destination so an
 * available certificate is never discarded; (3) otherwise prefer the most recently
 * created enrollment; (4) `courseRunId` breaks any remaining tie only as a last,
 * stable resort — never used as the course-match key itself.
 */
const pickWinningEnrollment = (candidates: NormalizedEnrollment[]): NormalizedEnrollment => {
  const sorted = [...candidates].sort((a, b) => {
    const aCompleted = a.courseRunStatus === COURSE_STATUSES.completed;
    const bCompleted = b.courseRunStatus === COURSE_STATUSES.completed;
    if (aCompleted !== bCompleted) {
      return aCompleted ? -1 : 1;
    }

    if (aCompleted && bCompleted) {
      const aHasCertificate = isNonEmpty(a.linkToCertificate);
      const bHasCertificate = isNonEmpty(b.linkToCertificate);
      if (aHasCertificate !== bHasCertificate) {
        return aHasCertificate ? -1 : 1;
      }
    }

    const createdDiff = new Date(b.created).getTime() - new Date(a.created).getTime();
    if (createdDiff !== 0) {
      return createdDiff;
    }

    return a.courseRunId.localeCompare(b.courseRunId);
  });
  return sorted[0];
};

/**
 * The single enrollment-to-Pathway-status derivation for the Learner Pathways
 * feature. Pure and render-time only: never writes to Zustand/localStorage, never
 * mutates its inputs, and produces both the resolved rows and their aggregate
 * progress summary from the same derived statuses so they can never disagree.
 */
export const resolvePathwayCourses = ({
  pathwayCourses,
  enrollments,
  enterpriseSlug,
}: ResolvePathwayCoursesInput): ResolvePathwayCoursesResult => {
  const eligibleEnrollments = (enrollments || []).filter(
    (enrollment) => enrollment.isEnrollmentActive && !enrollment.isRevoked,
  );

  const enrollmentsByCourseKey = new Map<string, NormalizedEnrollment[]>();
  eligibleEnrollments.forEach((enrollment) => {
    const existing = enrollmentsByCourseKey.get(enrollment.courseKey);
    if (existing) {
      existing.push(enrollment);
    } else {
      enrollmentsByCourseKey.set(enrollment.courseKey, [enrollment]);
    }
  });

  const courses: ResolvedPathwayCourse[] = pathwayCourses.map((pathwayCourse) => {
    const candidates = enrollmentsByCourseKey.get(pathwayCourse.courseKey);

    if (!candidates || candidates.length === 0) {
      return {
        ...pathwayCourse,
        status: 'not_started',
        action: buildViewCourseAction(pathwayCourse.courseKey, enterpriseSlug),
      };
    }

    const winner = pickWinningEnrollment(candidates);
    const status = deriveStatus(winner.courseRunStatus);
    const action = deriveAction(status, winner, pathwayCourse.courseKey, enterpriseSlug);

    return { ...pathwayCourse, status, action };
  });

  const progress: PathwayProgress = {
    completed: courses.filter((course) => course.status === 'completed').length,
    inProgress: courses.filter((course) => course.status === 'in_progress').length,
    upcoming: courses.filter((course) => course.status === 'not_started').length,
    totalCourses: courses.length,
  };

  return { courses, progress };
};
