import React from 'react';
import { Container, Button } from '@openedx/paragon';

export interface IntakeQuestionsContainerProps {
  onNext: () => void;
  onBack?: () => void;
}

const IntakeQuestionsContainer: React.FC<IntakeQuestionsContainerProps> = ({ onNext, onBack }) => (
  <section data-testid="intake-questions-container" className="mt-4">
    <Container fluid>
      <h2>Onboarding Quiz</h2>
      <section data-testid="intake-motivation"><h3>Motivation</h3><p>Mock motivation</p></section>
      <section data-testid="intake-goal"><h3>Goal</h3><p>Mock goal</p></section>
      <section data-testid="intake-background"><h3>Background</h3><p>Mock background</p></section>
      <section data-testid="intake-industry"><h3>Industry</h3><p>Mock industry</p></section>
      <div className="d-flex justify-content-between mt-3">
        {onBack ? <Button variant="secondary" data-testid="intake-back-button" onClick={onBack}>Back</Button> : <span />}
        <Button variant="primary" data-testid="intake-continue-button" onClick={onNext}>Continue</Button>
      </div>
    </Container>
  </section>
);

export default IntakeQuestionsContainer;
