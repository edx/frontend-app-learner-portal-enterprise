import React from 'react';
import { Stack } from '@openedx/paragon';
import IntakeHeader from './IntakeHeader';
import IntakeQuestionsContainer, { IntakeQuestionsContainerProps } from './IntakeQuestionsContainer';

const IntakePage = ({
  onSubmit,
  onSkip,
  flowVariant,
  isProfileSubmitting,
  profileError,
}: IntakeQuestionsContainerProps) => (
  <section data-testid="intake-page">
    <Stack gap={4}>
      <IntakeHeader />
      <IntakeQuestionsContainer
        onSubmit={onSubmit}
        onSkip={onSkip}
        flowVariant={flowVariant}
        isProfileSubmitting={isProfileSubmitting}
        profileError={profileError}
      />
    </Stack>
  </section>
);

export default IntakePage;
