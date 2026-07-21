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
  derivePathwayProgress,
  getDisplayedPathwayCourses,
  useOneTimeFeedbackPrompt,
} from './pathway-courses';
import messages from './pathway-courses/messages';

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

  const courses = getDisplayedPathwayCourses(storeCourses);
  // `state.progress` is reserved for a future workflow-computed value (see
  // generatePathwayWorkflow.ts) that may not be derivable client-side from
  // the displayed course list alone. Until that workflow exists, derive
  // progress from the same courses shown in the table so the summary card
  // and table never disagree.
  const progress = useMemo(() => derivePathwayProgress(courses), [courses]);

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
