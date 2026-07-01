import React from 'react';
import { Badge } from '@openedx/paragon';
import { useIntl } from '@edx/frontend-platform/i18n';

import type { PathwayCourseStatus } from '../state';
import { STATUS_BADGE_VARIANT, STATUS_MESSAGE } from './constants';

export interface PathwayCourseStatusBadgeProps {
  status: PathwayCourseStatus;
}

const PathwayCourseStatusBadge = ({ status }: PathwayCourseStatusBadgeProps) => {
  const intl = useIntl();

  return (
    <Badge variant={STATUS_BADGE_VARIANT[status]}>
      {intl.formatMessage(STATUS_MESSAGE[status])}
    </Badge>
  );
};

export default PathwayCourseStatusBadge;
