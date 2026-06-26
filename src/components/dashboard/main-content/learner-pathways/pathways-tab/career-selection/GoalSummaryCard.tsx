import React, { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Form,
  Row,
  Spinner,
} from '@openedx/paragon';
import { Edit } from '@openedx/paragon/icons';
import { useIntl } from '@edx/frontend-platform/i18n';

import type { LearnerProfile } from '../state';
import type { GoalSummaryFields } from './CareerSelectionPage';
import messages from './messages';

export interface GoalSummaryCardProps {
  profile: LearnerProfile;
  isEditing: boolean;
  isProfileSubmitting?: boolean;
  profileError?: string | null;
  onBeginEditing: () => void;
  onEndEditing: () => void;
  onSubmitGoalSummary: (updates: GoalSummaryFields) => Promise<void> | void;
}

const GoalSummaryCard = ({
  profile,
  isEditing,
  isProfileSubmitting = false,
  profileError = 'true',
  onBeginEditing,
  onEndEditing,
  onSubmitGoalSummary,
}: GoalSummaryCardProps) => {
  const intl = useIntl();
  const [draft, setDraft] = useState<GoalSummaryFields>({
    careerGoal: profile.careerGoal,
    targetIndustry: profile.targetIndustry,
    background: profile.background,
    motivation: profile.motivation,
  });

  // Track previous isEditing value to detect when edit mode opens.
  const prevIsEditingRef = useRef(isEditing);
  useEffect(() => {
    const wasEditing = prevIsEditingRef.current;
    prevIsEditingRef.current = isEditing;
    if (!wasEditing && isEditing) {
      setDraft({
        careerGoal: profile.careerGoal,
        targetIndustry: profile.targetIndustry,
        background: profile.background,
        motivation: profile.motivation,
      });
    }
  }, [isEditing, profile.careerGoal, profile.targetIndustry, profile.background, profile.motivation]);

  const isDirty = draft.careerGoal !== profile.careerGoal
    || draft.targetIndustry !== profile.targetIndustry
    || draft.background !== profile.background
    || draft.motivation !== profile.motivation;

  const submitGoalSummary = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isDirty || isProfileSubmitting) {
      return;
    }
    try {
      await onSubmitGoalSummary({
        careerGoal: draft.careerGoal.trim(),
        targetIndustry: draft.targetIndustry.trim(),
        background: draft.background.trim(),
        motivation: draft.motivation.trim(),
      });
      onEndEditing();
    } catch {
      // Error state is owned by the parent container; stay in edit mode for retry.
    }
  };

  const renderValue = (value: string) => value || intl.formatMessage(messages.notProvided);

  return (
    <Card className="mb-3 shadow-sm" data-testid="goal-summary-card">
      <Form onSubmit={submitGoalSummary}>
        <Card.Body className="p-4">
          <div className="d-flex justify-content-between align-items-start mb-4.5">
            <h2 className="mb-0">
              {intl.formatMessage(messages.goalSummary)}
            </h2>
            {isEditing ? (
              <div className="d-flex align-items-center">
                <Button
                  type="button"
                  variant="tertiary"
                  size="sm"
                  className="mr-2"
                  onClick={onEndEditing}
                  disabled={isProfileSubmitting}
                >
                  {intl.formatMessage(messages.cancel)}
                </Button>
                <Button
                  type="submit"
                  variant="outline-primary"
                  size="sm"
                  disabled={!isDirty || isProfileSubmitting}
                  data-testid="goal-summary-submit-button"
                >
                  {isProfileSubmitting && (
                    <Spinner
                      animation="border"
                      size="sm"
                      className="mr-2"
                      screenReaderText={intl.formatMessage(messages.submitting)}
                    />
                  )}
                  {intl.formatMessage(
                    isProfileSubmitting ? messages.submitting : messages.submit,
                  )}
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline-primary"
                size="sm"
                iconBefore={Edit}
                onClick={onBeginEditing}
                data-testid="goal-summary-edit-button"
              >
                {intl.formatMessage(messages.edit)}
              </Button>
            )}
          </div>

          {profileError && (
            <Alert variant="danger" className="mb-4">
              {profileError}
            </Alert>
          )}

          {isEditing ? (
            <>
              <Row>
                <Col md={6}>
                  <Form.Group controlId="career-selection-career-goal">
                    <Form.Label>
                      <span className="h3">{intl.formatMessage(messages.careerGoal)}</span>
                    </Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={2}
                      value={draft.careerGoal}
                      onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => setDraft(
                        { ...draft, careerGoal: event.target.value },
                      )}
                      disabled={isProfileSubmitting}
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group controlId="career-selection-target-industry">
                    <Form.Label>
                      <span className="h3">{intl.formatMessage(messages.targetIndustry)}</span>
                    </Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={2}
                      value={draft.targetIndustry}
                      onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => setDraft(
                        { ...draft, targetIndustry: event.target.value },
                      )}
                      disabled={isProfileSubmitting}
                    />
                  </Form.Group>
                </Col>
              </Row>
              <Form.Group controlId="career-selection-background">
                <Form.Label>
                  <span className="h3">{intl.formatMessage(messages.background)}</span>
                </Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={draft.background}
                  onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => setDraft(
                    { ...draft, background: event.target.value },
                  )}
                  disabled={isProfileSubmitting}
                />
              </Form.Group>
              <Form.Group
                controlId="career-selection-motivation"
                className="mb-0"
              >
                <Form.Label>
                  <span className="h3">{intl.formatMessage(messages.motivation)}</span>
                </Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={draft.motivation}
                  onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => setDraft(
                    { ...draft, motivation: event.target.value },
                  )}
                  disabled={isProfileSubmitting}
                />
              </Form.Group>
            </>
          ) : (
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
          )}
        </Card.Body>
      </Form>
    </Card>
  );
};

export default GoalSummaryCard;
