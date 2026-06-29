import React, { useEffect } from 'react';
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
import { useForm } from 'react-hook-form';

import type { LearnerProfile } from '../state';
import { AutoExpandingTextareaField, requiredNonWhitespace } from '../shared';
import { DEFAULT_MAX_CHARACTERS_PER_INTAKE_QUESTION } from '../intake/constants';
import messages from './messages';

export type GoalSummaryFields = Pick<LearnerProfile, 'careerGoal' | 'targetIndustry' | 'background' | 'motivation'>;

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
  profileError = null,
  onBeginEditing,
  onEndEditing,
  onSubmitGoalSummary,
}: GoalSummaryCardProps) => {
  const intl = useIntl();

  const {
    control,
    formState,
    handleSubmit,
    reset,
  } = useForm<GoalSummaryFields>({
    defaultValues: {
      careerGoal: profile.careerGoal,
      targetIndustry: profile.targetIndustry,
      background: profile.background,
      motivation: profile.motivation,
    },
    mode: 'onChange',
  });

  useEffect(() => {
    if (!isEditing) {
      return;
    }
    reset({
      careerGoal: profile.careerGoal,
      targetIndustry: profile.targetIndustry,
      background: profile.background,
      motivation: profile.motivation,
    });
  }, [isEditing, profile.careerGoal, profile.targetIndustry, profile.background, profile.motivation, reset]);

  const onValidSubmit = async (values: GoalSummaryFields) => {
    if (isProfileSubmitting) {
      return;
    }
    try {
      await onSubmitGoalSummary({
        careerGoal: values.careerGoal.trim(),
        targetIndustry: values.targetIndustry.trim(),
        background: values.background.trim(),
        motivation: values.motivation.trim(),
      });
      onEndEditing();
    } catch {
      // Error state is owned by the parent container; stay in edit mode for retry.
    }
  };

  const renderValue = (value: string) => value || intl.formatMessage(messages.notProvided);

  return (
    <Card className="mb-3 shadow-sm" data-testid="goal-summary-card">
      <Form onSubmit={handleSubmit(onValidSubmit)}>
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
                  disabled={!formState.isDirty || isProfileSubmitting || !formState.isValid}
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
                  <AutoExpandingTextareaField
                    name="careerGoal"
                    control={control}
                    rules={{
                      validate: {
                        required: requiredNonWhitespace(
                          intl.formatMessage(messages.careerGoalRequiredError),
                        ),
                      },
                    }}
                    controlId="career-selection-career-goal"
                    label={intl.formatMessage(messages.careerGoal)}
                    labelClassName="h3"
                    maxCharacters={DEFAULT_MAX_CHARACTERS_PER_INTAKE_QUESTION}
                    disabled={isProfileSubmitting}
                    fieldTestId="goal-summary-career-goal-field"
                    feedbackTestId="goal-summary-career-goal-feedback"
                  />
                </Col>
                <Col md={6}>
                  <AutoExpandingTextareaField
                    name="targetIndustry"
                    control={control}
                    rules={{
                      validate: {
                        required: requiredNonWhitespace(
                          intl.formatMessage(messages.targetIndustryRequiredError),
                        ),
                      },
                    }}
                    controlId="career-selection-target-industry"
                    label={intl.formatMessage(messages.targetIndustry)}
                    labelClassName="h3"
                    maxCharacters={DEFAULT_MAX_CHARACTERS_PER_INTAKE_QUESTION}
                    disabled={isProfileSubmitting}
                    fieldTestId="goal-summary-target-industry-field"
                    feedbackTestId="goal-summary-target-industry-feedback"
                  />
                </Col>
              </Row>
              <AutoExpandingTextareaField
                name="background"
                control={control}
                rules={{
                  validate: {
                    required: requiredNonWhitespace(
                      intl.formatMessage(messages.backgroundRequiredError),
                    ),
                  },
                }}
                controlId="career-selection-background"
                label={intl.formatMessage(messages.background)}
                labelClassName="h3"
                maxCharacters={DEFAULT_MAX_CHARACTERS_PER_INTAKE_QUESTION}
                disabled={isProfileSubmitting}
                fieldTestId="goal-summary-background-field"
                feedbackTestId="goal-summary-background-feedback"
              />
              <AutoExpandingTextareaField
                name="motivation"
                control={control}
                rules={{
                  validate: {
                    required: requiredNonWhitespace(
                      intl.formatMessage(messages.motivationRequiredError),
                    ),
                  },
                }}
                controlId="career-selection-motivation"
                label={intl.formatMessage(messages.motivation)}
                labelClassName="h3"
                maxCharacters={DEFAULT_MAX_CHARACTERS_PER_INTAKE_QUESTION}
                disabled={isProfileSubmitting}
                className="mb-0"
                fieldTestId="goal-summary-motivation-field"
                feedbackTestId="goal-summary-motivation-feedback"
              />
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
