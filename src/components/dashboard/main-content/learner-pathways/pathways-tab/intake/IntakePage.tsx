import React from 'react';
import { Stack } from '@openedx/paragon';
import IntakeHeader from './IntakeHeader';
import IntakeQuestionsContainer, { IntakeQuestionsContainerProps } from './IntakeQuestionsContainer';

const IntakePage = ({
  onSubmit,
  onSkip,
  isProfileSubmitting,
  profileError,
}: IntakeQuestionsContainerProps) => (
  <section data-testid="intake-page">
    <Stack gap={4}>
      <IntakeHeader />
      <IntakeQuestionsContainer
        onSubmit={onSubmit}
        onSkip={onSkip}
        isProfileSubmitting={isProfileSubmitting}
        profileError={profileError}
      />
    </Stack>
  </section>
);

export default IntakePage;
