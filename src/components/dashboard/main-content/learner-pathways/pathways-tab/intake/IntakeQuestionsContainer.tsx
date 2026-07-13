import React, { useEffect, useMemo } from 'react';
import { Form, Stack } from '@openedx/paragon';
import { useIntl } from '@edx/frontend-platform/i18n';
import { FormProvider, useForm } from 'react-hook-form';
import { debounce } from 'lodash-es';
import { EMPTY_LEARNER_INTENT, usePathwaysStore } from '../state';
import type { LearnerIntent } from '../state';
import { usePathwaysActionBar } from '../action-bar';
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
  onSubmit: (values: IntakeFormValues) => void;
  onSkip?: () => void;
}

const FORM_ID = 'pathways-intake-form';

const IntakeQuestionsContainer = ({
  onSubmit,
  onSkip,
}: IntakeQuestionsContainerProps) => {
  const learnerIntent = usePathwaysStore((state) => state.learnerIntent);
  const setLearnerIntent = usePathwaysStore((state) => state.setLearnerIntent);
  const intl = useIntl();
  const { registerActions, clearActions } = usePathwaysActionBar();

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

  // Live-sync drafts into Zustand (and therefore localStorage) so Retake Quiz or a
  // refresh restores in-progress answers. Values are persisted raw (whitespace
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

  const handleFormSubmit = methods.handleSubmit((values) => {
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
    onSubmit(normalizedValues);
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
        variant: 'primary',
        type: 'submit',
        form: FORM_ID,
        testId: 'intake-submit-button',
      },
      secondary: onSkip
        ? [{
          id: 'intake-skip',
          label: messages.skipToDashboard,
          variant: 'tertiary',
          type: 'button',
          onClick: onSkip,
          testId: 'intake-skip-button',
        }]
        : [],
      alignment: 'end',
    });
    return () => clearActions();
  }, [onSkip, registerActions, clearActions, intl]);

  return (
    <section data-testid="intake-questions-container">
      <FormProvider {...methods}>
        <Form id={FORM_ID} onSubmit={handleFormSubmit} data-testid="intake-form">
          <Stack gap={4}>
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
