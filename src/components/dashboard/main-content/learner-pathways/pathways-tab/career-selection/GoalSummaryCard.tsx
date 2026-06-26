import React, { useEffect, useRef } from 'react';
import {
  Alert,
  Button,
  Card,
  Form,
  Spinner,
} from '@openedx/paragon';
import { Edit } from '@openedx/paragon/icons';
import { useIntl } from '@edx/frontend-platform/i18n';
import { useForm } from 'react-hook-form';

import type { LearnerProfile } from '../state';
import type { GoalSummaryFields } from './CareerSelectionPage';
import GoalSummaryEditForm from './GoalSummaryEditForm';
import GoalSummaryReadOnly from './GoalSummaryReadOnly';
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

  // Track previous isEditing to detect when edit mode opens and reset the form.
  const prevIsEditingRef = useRef(isEditing);
  useEffect(() => {
    const wasEditing = prevIsEditingRef.current;
    prevIsEditingRef.current = isEditing;
    if (!wasEditing && isEditing) {
      reset({
        careerGoal: profile.careerGoal,
        targetIndustry: profile.targetIndustry,
        background: profile.background,
        motivation: profile.motivation,
      });
    }
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
            <GoalSummaryEditForm control={control} isProfileSubmitting={isProfileSubmitting} />
          ) : (
            <GoalSummaryReadOnly profile={profile} />
          )}
        </Card.Body>
      </Form>
    </Card>
  );
};

export default GoalSummaryCard;
