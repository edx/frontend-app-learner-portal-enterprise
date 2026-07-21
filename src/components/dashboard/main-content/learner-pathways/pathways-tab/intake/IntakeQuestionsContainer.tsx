import React, { useEffect, useMemo } from 'react';
import { Form, Stack } from '@openedx/paragon';
import { useIntl } from '@edx/frontend-platform/i18n';
import { getConfig } from '@edx/frontend-platform/config';
import { FormProvider, useForm } from 'react-hook-form';
import { debounce } from 'lodash-es';
import { EMPTY_LEARNER_INTENT, usePathwaysStore } from '../state';
import type { LearnerIntent } from '../state';
import { usePathwaysActionBar } from '../action-bar';
import { RequestErrorAlert, buildGiveFeedbackAction } from '../shared';
import IntakeQuestionSection from './IntakeQuestionSection';
import IntakeBackgroundQuestions from './IntakeBackgroundQuestions';
import IntakeGoalsQuestions from './IntakeGoalsQuestions';
import messages from './messages';

/**
 * Every Zustand update now triggers a localStorage write (see state/persistence.ts),
 * so draft persistence is debounced rather than synced on every keystroke.
 */
const DRAFT_SYNC_DEBOUNCE_MS = 300;

export type IntakeFormValues = LearnerIntent;

export interface IntakeQuestionsContainerProps {
  onSubmit: (values: IntakeFormValues) => void | Promise<void>;
  onSkip?: () => void;
  /** Whether profile generation triggered by this submission is currently in flight. */
  isProfileSubmitting?: boolean;
  /** Displayable error from the most recent failed profile-generation attempt, if any. */
  profileError?: string | null;
}

const FORM_ID = 'pathways-intake-form';

const IntakeQuestionsContainer = ({
  onSubmit,
  onSkip,
  isProfileSubmitting,
  profileError,
}: IntakeQuestionsContainerProps) => {
  const learnerIntent = usePathwaysStore((state) => state.learnerIntent);
  const setLearnerIntent = usePathwaysStore((state) => state.setLearnerIntent);
  const intl = useIntl();
  const { registerActions, clearActions } = usePathwaysActionBar();
  const feedbackFormUrl = getConfig().PATHWAYS_FEEDBACK_FORM_URL;
  const giveFeedbackAction = buildGiveFeedbackAction(feedbackFormUrl);

  const methods = useForm<IntakeFormValues>({
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    shouldFocusError: true,
    defaultValues: {
      motivation: learnerIntent.motivation,
      careerGoal: learnerIntent.careerGoal,
      background: learnerIntent.background,
      targetIndustry: learnerIntent.targetIndustry,
    },
  });

  // Live-sync drafts into Zustand (and therefore localStorage) so a refresh, or
  // navigating away (e.g. via breadcrumbs) and back without submitting, restores
  // in-progress answers. Retake Quiz is the one navigation path that deliberately
  // clears learnerIntent first (see CareerSelectionContainer's confirmRetakeQuiz), so
  // this draft is never restored there. Values are persisted raw (whitespace
  // preserved while typing); only the valid-submit path below trims. Debounced to
  // avoid a localStorage write on every keystroke.
  const syncDraft = useMemo(
    () => debounce((values: Partial<IntakeFormValues>) => {
      setLearnerIntent({
        motivation: values.motivation ?? EMPTY_LEARNER_INTENT.motivation,
        careerGoal: values.careerGoal ?? EMPTY_LEARNER_INTENT.careerGoal,
        background: values.background ?? EMPTY_LEARNER_INTENT.background,
        targetIndustry: values.targetIndustry ?? EMPTY_LEARNER_INTENT.targetIndustry,
      });
    }, DRAFT_SYNC_DEBOUNCE_MS),
    [setLearnerIntent],
  );

  const handleFormSubmit = methods.handleSubmit(async (values) => {
    // Cancel any pending debounced draft sync so it can never fire after submit and
    // clobber the trimmed, authoritative values committed below.
    syncDraft.cancel();
    const normalizedValues: IntakeFormValues = {
      motivation: (values.motivation ?? EMPTY_LEARNER_INTENT.motivation).trim(),
      careerGoal: (values.careerGoal ?? EMPTY_LEARNER_INTENT.careerGoal).trim(),
      background: (values.background ?? EMPTY_LEARNER_INTENT.background).trim(),
      targetIndustry: (values.targetIndustry ?? EMPTY_LEARNER_INTENT.targetIndustry).trim(),
    };
    setLearnerIntent(normalizedValues);
    try {
      await onSubmit(normalizedValues);
    } catch {
      // Pending/error state is owned by the parent composition (isProfileSubmitting/
      // profileError props) — swallow here only so the native form submit handler
      // doesn't surface an unhandled rejection; the learner stays on this view to retry.
    }
  });

  useEffect(() => {
    const subscription = methods.watch((values) => syncDraft(values));
    return () => {
      subscription.unsubscribe();
      syncDraft.cancel();
    };
  }, [methods, syncDraft]);

  // Register submit (and optional skip) in the page-level action bar.
  // External <button type="submit" form={FORM_ID}> triggers handleFormSubmit
  // via the native form submit event — react-hook-form validates as normal.
  useEffect(() => {
    registerActions({
      primary: {
        id: 'intake-submit',
        label: messages.submitAndReviewProfile,
        loadingLabel: messages.submittingProfile,
        variant: 'primary',
        type: 'submit',
        form: FORM_ID,
        loading: isProfileSubmitting,
        disabled: isProfileSubmitting,
        testId: 'intake-submit-button',
      },
      secondary: [
        ...(giveFeedbackAction ? [giveFeedbackAction] : []),
        ...(onSkip
          ? [{
            id: 'intake-skip',
            label: messages.skipToDashboard,
            variant: 'tertiary',
            type: 'button' as const,
            disabled: isProfileSubmitting,
            onClick: onSkip,
            testId: 'intake-skip-button',
          }]
          : []),
      ],
      alignment: 'end',
    });
    return () => clearActions();
  }, [onSkip, isProfileSubmitting, registerActions, clearActions, intl, giveFeedbackAction]);

  return (
    <section data-testid="intake-questions-container">
      <FormProvider {...methods}>
        <Form id={FORM_ID} onSubmit={handleFormSubmit} data-testid="intake-form">
          <Stack gap={4}>
            <RequestErrorAlert error={profileError} />
            <IntakeQuestionSection
              title={intl.formatMessage(messages.goalsSectionTitle)}
              emptyPlaceholderTestId="intake-goals-questions-placeholder"
            >
              <IntakeGoalsQuestions />
            </IntakeQuestionSection>
            <IntakeQuestionSection
              title={intl.formatMessage(messages.backgroundSectionTitle)}
              emptyPlaceholderTestId="intake-background-questions-placeholder"
            >
              <IntakeBackgroundQuestions />
            </IntakeQuestionSection>
          </Stack>
        </Form>
      </FormProvider>
    </section>
  );
};

export default IntakeQuestionsContainer;
