import React from 'react';
import { Container, Button } from '@openedx/paragon';

export interface PathwayCoursesContainerProps {
  onBackToOnboarding?: () => void;
  onBackToProfile?: () => void;
}

const mockCourses = [
  { title: 'Intro to Data', level: 'Beginner', length: '4 weeks', why: 'Build foundational skills' },
  { title: 'Data Analysis', level: 'Intermediate', length: '6 weeks', why: 'Apply skills to projects' },
  { title: 'Advanced ML', level: 'Advanced', length: '8 weeks', why: 'Prepare for ML roles' },
];

const PathwayCoursesContainer: React.FC<PathwayCoursesContainerProps> = ({ onBackToOnboarding, onBackToProfile }) => (
  <section data-testid="pathway-container" className="mt-4">
    <Container fluid>
      <h2>Your Pathway</h2>
      <div data-testid="pathway-course-list">
        {mockCourses.map((c, i) => (
          <div key={c.title} data-testid={`pathway-course-${i}`} className="mb-3 p-2 border rounded">
            <strong>{c.title}</strong>
            <div>Level: {c.level}</div>
            <div>Length: {c.length}</div>
            <div>Why this fits you: {c.why}</div>
          </div>
        ))}
      </div>
      <div className="d-flex justify-content-between mt-3">
        <Button variant="secondary" data-testid="pathway-adjust-button" onClick={onBackToOnboarding}>Adjust My Pathway</Button>
        <div>
          <Button variant="secondary" className="mr-2" data-testid="pathway-view-profile-button" onClick={onBackToProfile}>View Profile</Button>
          <Button variant="secondary" data-testid="pathway-view-onboarding-button" onClick={onBackToOnboarding}>View Onboarding Quiz</Button>
        </div>
      </div>
    </Container>
  </section>
);

export default PathwayCoursesContainer;
