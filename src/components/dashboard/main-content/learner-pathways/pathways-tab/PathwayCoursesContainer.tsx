import React, { useCallback, useEffect, useMemo } from 'react';
import { useIntl } from '@edx/frontend-platform/i18n';
import { ArrowBack } from '@openedx/paragon/icons';
import { usePathwaysActionBar } from './action-bar';
import { usePathwaysCourses } from './state';
import { PathwayCoursesPage, derivePathwayProgress, getDisplayedPathwayCourses } from './pathway-courses';
import messages from './pathway-courses/messages';

export interface PathwayCoursesContainerProps {
  onBackToProfile?: () => void;
}

const noOp = () => {};

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
      secondary: [
        {
          id: 'pathway-view-pathway',
          label: messages.viewPathway,
          variant: 'tertiary',
          type: 'button',
          onClick: noOp,
          testId: 'pathway-view-pathway-button',
        },
        {
          id: 'pathway-view-quiz',
          label: messages.viewQuiz,
          variant: 'tertiary',
          type: 'button',
          onClick: noOp,
          testId: 'pathway-view-quiz-button',
        },
      ],
      alignment: 'split',
    });
    return () => clearActions();
  }, [handleBackToProfile, registerActions, clearActions, intl]);

  return <PathwayCoursesPage courses={courses} progress={progress} />;
};

export default PathwayCoursesContainer;
