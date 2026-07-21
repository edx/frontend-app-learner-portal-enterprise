import { useCallback, useMemo, useReducer } from 'react';

import {
  derivePathwaysExperienceStatus,
  usePathwaysLearnerIntent,
  usePathwaysLearnerProfile,
  usePathwaysCourses,
  usePathwaysStore,
  useSelectedCareerMatch,
} from '../../pathways-tab/state';
import { resolvePathwayCourses } from '../../pathways-tab/pathway-courses';
import { useEnterpriseCourseEnrollments, useEnterpriseCustomer } from '../../../../../app/data';
import { DASHBOARD_PATHWAYS_TAB } from '../../../../data/constants';
import { resolveLearnerPathwaysAlertDescriptor } from './utils';
import { isDismissed, recordDismissal } from './bannerDismissal';
import type { LearnerPathwaysAlertViewModel } from '../types';

export interface UseLearnerPathwaysAlertViewModelInput {
  onSelectTab: (tabName: string) => void;
  hasPathwaysTab: boolean;
}

/**
 * The Courses-tab alert's container brain: reads canonical Learner Pathways state plus
 * the enrollment-derived pathway progress (via the existing `resolvePathwayCourses`
 * resolver — never re-derived here), and returns a fully-resolved view model for the
 * purely-presentational `LearnerPathwaysAlert` to render.
 */
export function useLearnerPathwaysAlertViewModel({
  onSelectTab,
  hasPathwaysTab,
}: UseLearnerPathwaysAlertViewModelInput): LearnerPathwaysAlertViewModel {
  const learnerIntent = usePathwaysLearnerIntent();
  const learnerProfile = usePathwaysLearnerProfile();
  const pathwayCourses = usePathwaysCourses();
  const setSection = usePathwaysStore((state) => state.setSection);
  const careerGoal = useSelectedCareerMatch()?.title ?? '';

  const { data: enterpriseCustomer } = useEnterpriseCustomer<EnterpriseCustomer>();
  const { data: { enterpriseCourseEnrollments } } = useEnterpriseCourseEnrollments();

  // Same resolver PathwayCoursesContainer uses for the pathway table/progress card —
  // the sole source of enrollment-derived progress, never re-derived here.
  const { progress } = useMemo(() => resolvePathwayCourses({
    pathwayCourses,
    enrollments: enterpriseCourseEnrollments,
    enterpriseSlug: enterpriseCustomer.slug,
  }), [pathwayCourses, enterpriseCourseEnrollments, enterpriseCustomer.slug]);

  const status = useMemo(() => derivePathwaysExperienceStatus({
    learnerIntent, learnerProfile, progress,
  }), [learnerIntent, learnerProfile, progress]);

  const descriptor = resolveLearnerPathwaysAlertDescriptor(status);

  // A localStorage write alone isn't reactive — force a re-render after dismissal so
  // `show` reflects the new stored rank immediately.
  const [, forceRerender] = useReducer((count) => count + 1, 0);
  const show = !isDismissed(status);
  const onDismiss = useCallback(() => {
    recordDismissal(status);
    forceRerender();
  }, [status]);

  const targetTab = hasPathwaysTab ? DASHBOARD_PATHWAYS_TAB : null;
  const ctaDisabled = !targetTab;
  const onCtaClick = useCallback(() => {
    if (!targetTab) {
      return;
    }
    setSection(descriptor.targetSection);
    onSelectTab(targetTab);
  }, [targetTab, setSection, descriptor.targetSection, onSelectTab]);

  return {
    status,
    show,
    descriptor,
    careerGoal,
    // Narrowed to the exact fields the alert's progress-line templates use — `progress`
    // also carries `upcoming`, which this alert has no template for.
    progress: descriptor.progressVariant ? {
      completed: progress.completed,
      inProgress: progress.inProgress,
      totalCourses: progress.totalCourses,
    } : null,
    ctaDisabled,
    onCtaClick,
    onDismiss,
  };
}
