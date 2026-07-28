import React, { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Button, Hyperlink } from '@openedx/paragon';
import { useIntl } from '@edx/frontend-platform/i18n';
import { sendEnterpriseTrackEvent } from '@2uinc/frontend-enterprise-utils';

import type { ResolvedPathwayCourseAction } from './resolvePathwayCourses';
import type { PathwayCourseStatus } from '../state';
import { ACTION_MESSAGE } from './constants';
import messages from './messages';
import { useEnterpriseCustomer } from '../../../../../app/data';
import { PATHWAYS_EVENTS } from '../../../../../../eventTracking';

export interface PathwayCourseActionButtonProps {
  action: ResolvedPathwayCourseAction;
  courseKey: string;
  courseTitle: string;
  courseStatus: PathwayCourseStatus;
}

/**
 * Renders one of three intentionally distinct row actions based on `action.kind`.
 * `view_certificate` is a genuinely external destination (Paragon `Hyperlink`,
 * new tab). `continue`/`view_course` are in-app navigation, so they use
 * react-router `Link` (via `Button as={Link}`) rather than `Hyperlink`, so
 * navigating stays a client-side route change instead of a full page reload.
 */
const PathwayCourseActionButton = ({
  action, courseKey, courseTitle, courseStatus,
}: PathwayCourseActionButtonProps) => {
  const intl = useIntl();
  const { data: enterpriseCustomer } = useEnterpriseCustomer();
  const label = intl.formatMessage(ACTION_MESSAGE[action.kind]);
  const srSuffix = (
    <span className="sr-only">
      {' '}
      {intl.formatMessage(messages.actionForCourse, { courseTitle })}
    </span>
  );

  const trackCourseClick = useCallback(() => {
    sendEnterpriseTrackEvent(enterpriseCustomer?.uuid, PATHWAYS_EVENTS.COURSE_CLICKED, {
      courseKey,
      actionKind: action.kind,
      courseStatus,
    });
  }, [enterpriseCustomer?.uuid, courseKey, action.kind, courseStatus]);

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
