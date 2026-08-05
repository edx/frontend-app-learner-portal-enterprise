import React, { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Button, Hyperlink } from '@openedx/paragon';
import { useIntl } from '@edx/frontend-platform/i18n';

import type { ResolvedPathwayCourseAction } from './resolvePathwayCourses';
import type { PathwayCourseStatus } from '../state';
import { ACTION_MESSAGE } from './constants';
import messages from './messages';
import { usePathwaysAnalytics } from '../hooks';

export interface PathwayCourseActionButtonProps {
  action: ResolvedPathwayCourseAction;
  courseKey: string;
  courseTitle: string;
  courseStatus: PathwayCourseStatus;
  coursePosition: number;
  hasRecommendationExplanation: boolean;
}

/**
 * Renders one of three intentionally distinct row actions based on `action.kind`.
 * `view_certificate` is a genuinely external destination (Paragon `Hyperlink`,
 * new tab). `continue`/`view_course` are in-app navigation, so they use
 * react-router `Link` (via `Button as={Link}`) rather than `Hyperlink`, so
 * navigating stays a client-side route change instead of a full page reload.
 */
const PathwayCourseActionButton = ({
  action, courseKey, courseTitle, courseStatus, coursePosition, hasRecommendationExplanation,
}: PathwayCourseActionButtonProps) => {
  const intl = useIntl();
  const { trackCourseClicked } = usePathwaysAnalytics();
  const label = intl.formatMessage(ACTION_MESSAGE[action.kind]);
  const srSuffix = (
    <span className="sr-only">
      {' '}
      {intl.formatMessage(messages.actionForCourse, { courseTitle })}
    </span>
  );

  const trackCourseClick = useCallback(() => {
    trackCourseClicked({
      courseKey,
      courseTitle,
      actionKind: action.kind,
      courseStatus,
      coursePosition,
      hasRecommendationExplanation,
    });
  }, [
    trackCourseClicked, courseKey, courseTitle, action.kind, courseStatus,
    coursePosition, hasRecommendationExplanation,
  ]);

  if (action.kind === 'view_certificate') {
    return (
      <Hyperlink
        destination={action.destination}
        target="_blank"
        className="text-nowrap"
        onClick={trackCourseClick}
      >
        {label}
        <span className="sr-only">
          {' '}
          {intl.formatMessage(messages.feedbackModalOpensNewTab)}
        </span>
        {srSuffix}
      </Hyperlink>
    );
  }

  return (
    <Button
      as={Link}
      to={action.destination}
      size="sm"
      variant={action.kind === 'continue' ? 'outline-primary' : 'primary'}
      className="text-nowrap"
      onClick={trackCourseClick}
    >
      {label}
      {srSuffix}
    </Button>
  );
};

export default PathwayCourseActionButton;
