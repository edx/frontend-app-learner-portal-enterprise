import React from 'react';
import { Link } from 'react-router-dom';
import { Button, Hyperlink } from '@openedx/paragon';
import { useIntl } from '@edx/frontend-platform/i18n';

import type { ResolvedPathwayCourseAction } from './resolvePathwayCourses';
import { ACTION_MESSAGE } from './constants';
import messages from './messages';

export interface PathwayCourseActionButtonProps {
  action: ResolvedPathwayCourseAction;
  courseTitle: string;
}

/**
 * Renders one of three intentionally distinct row actions based on `action.kind`.
 * `view_certificate` is a genuinely external destination (Paragon `Hyperlink`,
 * new tab). `continue`/`view_course` are in-app navigation, so they use
 * react-router `Link` (via `Button as={Link}`) rather than `Hyperlink`, so
 * navigating stays a client-side route change instead of a full page reload.
 */
const PathwayCourseActionButton = ({ action, courseTitle }: PathwayCourseActionButtonProps) => {
  const intl = useIntl();
  const label = intl.formatMessage(ACTION_MESSAGE[action.kind]);
  const srSuffix = (
    <span className="sr-only">
      {' '}
      {intl.formatMessage(messages.actionForCourse, { courseTitle })}
    </span>
  );

  if (action.kind === 'view_certificate') {
    return (
      <Hyperlink
        destination={action.destination}
        target="_blank"
        className="text-nowrap"
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
    >
      {label}
      {srSuffix}
    </Button>
  );
};

export default PathwayCourseActionButton;
