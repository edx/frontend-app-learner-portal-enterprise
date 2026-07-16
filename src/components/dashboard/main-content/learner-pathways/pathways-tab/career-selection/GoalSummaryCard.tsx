import React, {
  useEffect, useImperativeHandle, useRef,
} from 'react';
import {
  Card,
  Form,
} from '@openedx/paragon';
import { useForm } from 'react-hook-form';

import type { LearnerIntent } from '../state';
import GoalSummaryEditForm from './GoalSummaryEditForm';
import GoalSummaryReadOnly from './GoalSummaryReadOnly';
import GoalSummaryEditHeader from './GoalSummaryEditHeader';
import GoalSummaryReadOnlyHeader from './GoalSummaryReadOnlyHeader';
import GoalSummaryErrorAlert from './GoalSummaryErrorAlert';
import type { GoalSummaryFormValues } from './types';

export type { GoalSummaryFormValues } from './types';

export interface GoalSummaryCardHandle {
  /** Scrolls the card into view and moves focus to its first editable field. */
  focusFirstField: () => void;
}

export interface GoalSummaryCardProps {
  learnerIntent: LearnerIntent;
  isEditing: boolean;
  isProfileSubmitting: boolean;
  profileError: string | null;
  onBeginEditing: () => void;
  onEndEditing: () => void;
  onSubmitGoalSummary: (updates: GoalSummaryFormValues) => Promise<void> | void;
}

const GoalSummaryCard = React.forwardRef<GoalSummaryCardHandle, GoalSummaryCardProps>(({
  learnerIntent,
  isEditing,
  isProfileSubmitting,
  profileError,
  onBeginEditing,
  onEndEditing,
  onSubmitGoalSummary,
}: GoalSummaryCardProps, ref) => {
  const cardRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    focusFirstField: () => {
      cardRef.current?.scrollIntoView?.({ block: 'center' });
      cardRef.current?.querySelector('textarea')?.focus();
    },
  }), []);

  const {
    control,
    formState,
    handleSubmit,
    reset,
  } = useForm<GoalSummaryFormValues>({
    defaultValues: {
      careerGoal: learnerIntent.careerGoal,
      targetIndustry: learnerIntent.targetIndustry,
      background: learnerIntent.background,
      motivation: learnerIntent.motivation,
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
        careerGoal: learnerIntent.careerGoal,
        targetIndustry: learnerIntent.targetIndustry,
        background: learnerIntent.background,
        motivation: learnerIntent.motivation,
      });
    }
  }, [
    isEditing,
    learnerIntent.careerGoal,
    learnerIntent.targetIndustry,
    learnerIntent.background,
    learnerIntent.motivation,
    reset,
  ]);

  const onValidSubmit = async (values: GoalSummaryFormValues) => {
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
      <Card.Body ref={cardRef} className="p-4">
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
            <GoalSummaryReadOnly learnerIntent={learnerIntent} />
          </>
        )}
      </Card.Body>
    </Card>
  );
});

GoalSummaryCard.displayName = 'GoalSummaryCard';

export default GoalSummaryCard;
