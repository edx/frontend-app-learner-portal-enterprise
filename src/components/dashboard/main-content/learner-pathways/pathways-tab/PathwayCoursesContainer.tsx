import React, {
  useCallback, useEffect, useMemo,
} from 'react';
import { useIntl } from '@edx/frontend-platform/i18n';
import { getConfig } from '@edx/frontend-platform/config';
import { ArrowBack } from '@openedx/paragon/icons';
import { usePathwaysActionBar } from './action-bar';
import { usePathwaysCourses } from './state';
import { buildGiveFeedbackAction } from './shared';
import {
  PathwayCoursesPage,
  PathwayFeedbackModal,
  getDisplayedPathwayCourses,
  resolvePathwayCourses,
  useOneTimeFeedbackPrompt,
} from './pathway-courses';
import messages from './pathway-courses/messages';
import { useEnterpriseCourseEnrollments, useEnterpriseCustomer } from '../../../../app/data';

export interface PathwayCoursesContainerProps {
  onBackToProfile?: () => void;
}

const PathwayCoursesContainer = ({
  onBackToProfile,
}: PathwayCoursesContainerProps) => {
  const intl = useIntl();
  const { registerActions, clearActions } = usePathwaysActionBar();
  const storeCourses = usePathwaysCourses();
  const feedbackFormUrl = getConfig().PATHWAYS_FEEDBACK_FORM_URL;

  const { data: enterpriseCustomer } = useEnterpriseCustomer<EnterpriseCustomer>();
  const { data: { enterpriseCourseEnrollments } } = useEnterpriseCourseEnrollments();

  const pathwayCourses = getDisplayedPathwayCourses(storeCourses);
  // Enrollment-derived status/action are computed here, at render time, from the
  // same courses shown in the table — never written back to the Zustand store — so
  // the summary card and table can never disagree with each other or with the
  // learner's real enrollment state.
  const { courses, progress } = useMemo(() => resolvePathwayCourses({
    pathwayCourses,
    enrollments: enterpriseCourseEnrollments,
    enterpriseSlug: enterpriseCustomer.slug,
  }), [pathwayCourses, enterpriseCourseEnrollments, enterpriseCustomer.slug]);

  const handleBackToProfile = useCallback(() => {
    onBackToProfile?.();
  }, [onBackToProfile]);

  const giveFeedbackAction = buildGiveFeedbackAction(feedbackFormUrl);

  // Gated on the raw store, never the fixture-merged `courses` above — fixture/fallback
  // rendering must never be treated as a successfully generated pathway. Also gated on
  // the URL being configured, so a broken/no-op modal is never auto-shown.
  const hasGeneratedCourses = storeCourses.length > 0 && Boolean(feedbackFormUrl);
  const { isOpen: isFeedbackOpen, dismiss: dismissFeedbackPrompt } = useOneTimeFeedbackPrompt({
    hasGeneratedCourses,
  });

  useEffect(() => {
    registerActions({
      primary: {
        id: 'pathway-rebuild',
        label: messages.rebuildPathway,
        variant: 'tertiary',
        type: 'button',
        iconBefore: ArrowBack,
        onClick: handleBackToProfile,
        testId: 'pathway-rebuild-button',
      },
      secondary: giveFeedbackAction ? [giveFeedbackAction] : [],
      alignment: 'split',
    });
    return () => clearActions();
  }, [handleBackToProfile, registerActions, clearActions, intl, giveFeedbackAction]);

  return (
    <>
      <PathwayCoursesPage courses={courses} progress={progress} />
      <PathwayFeedbackModal
        isOpen={isFeedbackOpen}
        onClose={dismissFeedbackPrompt}
        onGiveFeedback={dismissFeedbackPrompt}
        feedbackFormUrl={feedbackFormUrl}
      />
    </>
  );
};

export default PathwayCoursesContainer;
