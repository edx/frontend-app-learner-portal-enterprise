import React, { useCallback, useEffect, useMemo } from 'react';
import { useIntl } from '@edx/frontend-platform/i18n';
import { getConfig } from '@edx/frontend-platform/config';
import { ArrowBack } from '@openedx/paragon/icons';
import { useEnterpriseCustomer } from '../../../../app/data';
import { getContactEmail } from '../../../../../utils/common';
import { usePathwaysActionBar } from './action-bar';
import { usePathwaysCourses } from './state';
import { PathwayCoursesPage, derivePathwayProgress, getDisplayedPathwayCourses } from './pathway-courses';
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
  const { data: enterpriseCustomer } = useEnterpriseCustomer();

  const courses = getDisplayedPathwayCourses(storeCourses);
  // `state.progress` is reserved for a future workflow-computed value (see
  // generatePathwayWorkflow.ts) that may not be derivable client-side from
  // the displayed course list alone. Until that workflow exists, derive
  // progress from the same courses shown in the table so the summary card
  // and table never disagree.
  const progress = useMemo(() => derivePathwayProgress(courses), [courses]);

  const courseSearchUrl = `/${enterpriseCustomer?.slug}/search`;
  const contactEmail = getContactEmail(enterpriseCustomer);
  const helpCenterUrl = getConfig().LEARNER_SUPPORT_URL;

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
      alignment: 'split',
    });
    return () => clearActions();
  }, [handleBackToProfile, registerActions, clearActions, intl]);

  return (
    <PathwayCoursesPage
      courses={courses}
      progress={progress}
      courseSearchUrl={courseSearchUrl}
      contactEmail={contactEmail}
      helpCenterUrl={helpCenterUrl}
    />
  );
};

export default PathwayCoursesContainer;
