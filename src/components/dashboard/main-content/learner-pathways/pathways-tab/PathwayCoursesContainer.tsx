import React, {
  useCallback, useEffect, useMemo, useRef,
} from 'react';
import { useIntl } from '@edx/frontend-platform/i18n';
import { getConfig } from '@edx/frontend-platform/config';
import { ArrowBack, Launch } from '@openedx/paragon/icons';
import { usePathwaysActionBar } from './action-bar';
import { usePathwaysCourses } from './state';
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

  // Ref shared between the portaled feedback footer button and PathwayFeedbackModal,
  // for focus-return-on-close.
  const feedbackButtonRef = useRef<HTMLButtonElement>(null);

  // Gated on the raw store, never the fixture-merged `courses` above — fixture/fallback
  // rendering must never be treated as a successfully generated pathway.
  const hasGeneratedCourses = storeCourses.length > 0;
  const {
    isOpen: isFeedbackOpen,
    openManually: openFeedbackModal,
    close: closeFeedbackModal,
  } = useOneTimeFeedbackPrompt({ hasGeneratedCourses });

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
      secondary: [{
        id: 'pathway-feedback',
        label: messages.giveFeedback,
        variant: 'tertiary',
        type: 'button',
        iconAfter: Launch,
        onClick: openFeedbackModal,
        buttonRef: feedbackButtonRef,
        testId: 'pathway-feedback-button',
      }],
      alignment: 'split',
    });
    return () => clearActions();
  }, [handleBackToProfile, openFeedbackModal, registerActions, clearActions, intl]);

  return (
    <>
      <PathwayCoursesPage courses={courses} progress={progress} />
      <PathwayFeedbackModal
        isOpen={isFeedbackOpen}
        onClose={closeFeedbackModal}
        onGiveFeedback={closeFeedbackModal}
        feedbackFormUrl={getConfig().PATHWAYS_FEEDBACK_FORM_URL}
        triggerRef={feedbackButtonRef}
      />
    </>
  );
};

export default PathwayCoursesContainer;
