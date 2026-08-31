import React, {
  useCallback, useEffect, useMemo, useRef,
} from 'react';
import { useIntl } from '@edx/frontend-platform/i18n';
import { getConfig } from '@edx/frontend-platform/config';
import { ArrowBack } from '@openedx/paragon/icons';
import { usePathwaysActionBar } from './action-bar';
import { usePathwaysCourses } from './state';
import { usePathwaysAnalytics } from './hooks';
import { buildGiveFeedbackAction } from './shared';
import {
  PathwayCoursesPage,
  PathwayFeedbackModal,
  getDisplayedPathwayCourses,
  resolvePathwayCourses,
  useOneTimeFeedbackPrompt,
} from './pathway-courses';
import messages from './pathway-courses/messages';
import careerMessages from './career-selection/messages';
import type { PathwaysFlowVariant } from './flowVariant';
import { useEnterpriseCourseEnrollments, useEnterpriseCustomer } from '../../../../app/data';

export interface PathwayCoursesContainerProps {
  /**
   * Navigate back to the Career Profile page. Career flow only — direct mode has no such
   * page, and uses `onOpenRetakeQuiz` as its leading action instead.
   */
  onBackToProfile?: () => void;
  /** Opens the shared retake-quiz confirmation modal, owned by LearnerPathwaysTab. */
  onOpenRetakeQuiz?: () => void;
  /** Which flow produced the courses being shown. Defaults to the career flow. */
  flowVariant?: PathwaysFlowVariant;
}

const PathwayCoursesContainer = ({
  onBackToProfile,
  onOpenRetakeQuiz,
  flowVariant = 'career',
}: PathwayCoursesContainerProps) => {
  const intl = useIntl();
  const { registerActions, clearActions } = usePathwaysActionBar();
  const { trackControlInteracted, trackFeedbackLinkClicked } = usePathwaysAnalytics();
  const storeCourses = usePathwaysCourses();
  const feedbackFormUrl = getConfig().PATHWAYS_FEEDBACK_FORM_URL;
  const isDirectFlow = flowVariant === 'direct';

  const { data: enterpriseCustomer } = useEnterpriseCustomer<EnterpriseCustomer>();
  const { data: { enterpriseCourseEnrollments } } = useEnterpriseCourseEnrollments();

  const pathwayCourses = getDisplayedPathwayCourses(storeCourses, flowVariant);
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
  const handleOpenRetakeQuiz = useCallback(() => {
    onOpenRetakeQuiz?.();
  }, [onOpenRetakeQuiz]);

  const giveFeedbackAction = buildGiveFeedbackAction(
    feedbackFormUrl,
    () => trackFeedbackLinkClicked({ feedbackSurface: 'pathway_courses' }),
  );

  // Gated on the raw store, never the fixture-merged `courses` above — fixture/fallback
  // rendering must never be treated as a successfully generated pathway. Also gated on
  // the URL being configured, so a broken/no-op modal is never auto-shown.
  const hasGeneratedCourses = storeCourses.length > 0 && Boolean(feedbackFormUrl);
  const { isOpen: isFeedbackOpen, dismiss: dismissFeedbackPrompt } = useOneTimeFeedbackPrompt({
    hasGeneratedCourses,
  });

  const hasTrackedFeedbackPromptOpenRef = useRef(false);
  useEffect(() => {
    if (isFeedbackOpen && !hasTrackedFeedbackPromptOpenRef.current) {
      hasTrackedFeedbackPromptOpenRef.current = true;
      trackControlInteracted({ sourceComponent: 'feedback_modal', interactionAction: 'opened' });
    }
  }, [isFeedbackOpen, trackControlInteracted]);

  const handleFeedbackMaybeLater = useCallback(() => {
    trackControlInteracted({ sourceComponent: 'feedback_modal', interactionAction: 'dismissed' });
    dismissFeedbackPrompt();
  }, [trackControlInteracted, dismissFeedbackPrompt]);

  const handleFeedbackGiveFeedback = useCallback(() => {
    trackFeedbackLinkClicked({ feedbackSurface: 'feedback_modal' });
    dismissFeedbackPrompt();
  }, [trackFeedbackLinkClicked, dismissFeedbackPrompt]);

  useEffect(() => {
    registerActions({
      // Direct mode has no Career Profile page to rebuild from, so its only backward
      // move is retaking the quiz — routed through the same shared confirmation modal
      // the breadcrumb already uses, since it discards the built pathway. ArrowBack is
      // kept: both actions move the learner back a step.
      primary: isDirectFlow
        ? {
          id: 'pathway-retake-quiz',
          label: careerMessages.retakeQuiz,
          variant: 'tertiary',
          type: 'button',
          iconBefore: ArrowBack,
          onClick: handleOpenRetakeQuiz,
          testId: 'pathway-retake-quiz-button',
        }
        : {
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
  }, [
    isDirectFlow, handleBackToProfile, handleOpenRetakeQuiz, registerActions, clearActions, intl, giveFeedbackAction,
  ]);

  return (
    <>
      <PathwayCoursesPage courses={courses} progress={progress} />
      <PathwayFeedbackModal
        isOpen={isFeedbackOpen}
        onClose={handleFeedbackMaybeLater}
        onGiveFeedback={handleFeedbackGiveFeedback}
        feedbackFormUrl={feedbackFormUrl}
      />
    </>
  );
};

export default PathwayCoursesContainer;
