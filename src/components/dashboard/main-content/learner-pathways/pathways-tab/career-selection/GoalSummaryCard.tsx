import React, { useEffect, useRef } from 'react';
import {
  Card,
  Form,
} from '@openedx/paragon';
import { useForm } from 'react-hook-form';

import type { LearnerProfile } from '../state';
import GoalSummaryEditForm from './GoalSummaryEditForm';
import GoalSummaryReadOnly from './GoalSummaryReadOnly';
import GoalSummaryEditHeader from './GoalSummaryEditHeader';
import GoalSummaryReadOnlyHeader from './GoalSummaryReadOnlyHeader';
import GoalSummaryErrorAlert from './GoalSummaryErrorAlert';
import type { GoalSummaryFields } from './types';

export type { GoalSummaryFields } from './types';

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
      <Card.Body className="p-4">
        {isEditing ? (
          <Form onSubmit={handleSubmit(onValidSubmit)}>
            <GoalSummaryEditHeader
              isProfileSubmitting={isProfileSubmitting}
              isDirty={formState.isDirty}
              isValid={formState.isValid}
              onCancel={onEndEditing}
            />
            <GoalSummaryErrorAlert error={profileError} />
            <GoalSummaryEditForm control={control} isProfileSubmitting={isProfileSubmitting} />
          </Form>
        ) : (
          <>
            <GoalSummaryReadOnlyHeader onBeginEditing={onBeginEditing} />
            <GoalSummaryErrorAlert error={profileError} />
            <GoalSummaryReadOnly profile={profile} />
          </>
        )}
      </Card.Body>
    </Card>
  );
};

export default GoalSummaryCard;
