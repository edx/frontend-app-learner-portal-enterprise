import React from 'react';
import { Col, Row } from '@openedx/paragon';
import { useIntl } from '@edx/frontend-platform/i18n';

import type { LearnerProfile } from '../state';
import messages from './messages';

interface GoalSummaryReadOnlyProps {
  profile: LearnerProfile;
}

const GoalSummaryReadOnly = ({ profile }: GoalSummaryReadOnlyProps) => {
  const intl = useIntl();
  const renderValue = (value: string) => value || intl.formatMessage(messages.notProvided);

  return (
    <>
      <Row className="mb-3">
        <Col
          md={6}
          className="mb-3 mb-md-0"
          data-testid="profile-career-goal"
        >
          <h3 className="h3 mb-1">
            {intl.formatMessage(messages.careerGoal)}
          </h3>
          <p className="mb-0">{renderValue(profile.careerGoal)}</p>
        </Col>
        <Col md={6} data-testid="profile-target-industry">
          <h3 className="h3 mb-1">
            {intl.formatMessage(messages.targetIndustry)}
          </h3>
          <p className="mb-0">{renderValue(profile.targetIndustry)}</p>
        </Col>
      </Row>
      <div className="mb-3" data-testid="profile-background">
        <h3 className="h3 mb-1">
          {intl.formatMessage(messages.background)}
        </h3>
        <p className="mb-0" style={{ whiteSpace: 'pre-wrap' }}>
          {renderValue(profile.background)}
        </p>
      </div>
      <div data-testid="profile-motivation">
        <h3 className="h3 mb-1">
          {intl.formatMessage(messages.motivation)}
        </h3>
        <p className="mb-0" style={{ whiteSpace: 'pre-wrap' }}>
          {renderValue(profile.motivation)}
        </p>
      </div>
    </>
  );
};

export default GoalSummaryReadOnly;
