import React from 'react';
import { Card } from '@openedx/paragon';

interface IntakeQuestionSectionProps {
  title: string;
  children?: React.ReactNode;
  emptyPlaceholderTestId: string;
}

const IntakeQuestionSection = ({
  title,
  children,
  emptyPlaceholderTestId,
}:IntakeQuestionSectionProps) => (
  <Card as="section" className="rounded">
    <Card.Section>
      <h3 className="h2 mb-3">{title}</h3>
      {children ?? (
        <div
          data-testid={emptyPlaceholderTestId}
          className="w-100 py-5"
          aria-hidden="true"
        />
      )}
    </Card.Section>
  </Card>
);

export default IntakeQuestionSection;
