import React from 'react';
import { Container, Button } from '@openedx/paragon';

export interface CareerSelectionContainerProps {
  onBack?: () => void;
  onNext?: () => void;
}

const CareerSelectionContainer: React.FC<CareerSelectionContainerProps> = ({ onBack, onNext }) => (
  <section data-testid="profile-container" className="mt-4">
    <Container fluid>
      <h2>Profile</h2>
      <section data-testid="profile-learner-profile"><h3>Learner Profile</h3><p>Mock profile summary</p></section>
      <section data-testid="profile-career-goal"><h3>Career Goal</h3><p>Mock career goal</p></section>
      <section data-testid="profile-target-industry"><h3>Target Industry</h3><p>Mock industry</p></section>
      <section data-testid="profile-background"><h3>Background</h3><p>Mock background</p></section>
      <section data-testid="profile-motivation"><h3>Motivation</h3><p>Mock motivation</p></section>
      <section data-testid="profile-career-matches"><h3>Career Matches</h3><p>Mock career matches</p></section>
      <section data-testid="profile-skills"><h3>Skills</h3><p>Mock skills</p></section>
      <div className="d-flex justify-content-between mt-3">
        <Button variant="secondary" data-testid="profile-view-onboarding-button" onClick={onBack}>View Onboarding Quiz</Button>
        <Button variant="primary" data-testid="profile-build-pathway-button" onClick={onNext}>Build My Learning Pathway</Button>
      </div>
    </Container>
  </section>
);

export default CareerSelectionContainer;
