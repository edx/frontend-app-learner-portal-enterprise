import React from 'react';
import { Stack } from '@openedx/paragon';
import IntakeHeader from './IntakeHeader';
import IntakeQuestionsContainer, { IntakeQuestionsContainerProps } from './IntakeQuestionsContainer';

const IntakePage: React.FC<IntakeQuestionsContainerProps> = ({
  onSubmit,
  onSkip,
}) => (
  <section data-testid="intake-page">
    <Stack gap={4}>
      <IntakeHeader />
      <IntakeQuestionsContainer
        onSubmit={onSubmit}
        onSkip={onSkip}
      />
    </Stack>
  </section>
);

export default IntakePage;
