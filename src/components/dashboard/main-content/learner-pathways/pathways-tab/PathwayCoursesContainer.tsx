import React, { useCallback, useEffect } from 'react';
import { Container } from '@openedx/paragon';
import { useIntl } from '@edx/frontend-platform/i18n';
import { usePathwaysActionBar } from './action-bar';
import messages from './messages';

export interface PathwayCoursesContainerProps {
  onBackToOnboarding?: () => void;
  onBackToProfile?: () => void;
}

const mockCourses = [
  {
    title: 'Intro to Data', level: 'Beginner', length: '4 weeks', why: 'Build foundational skills',
  },
  {
    title: 'Data Analysis', level: 'Intermediate', length: '6 weeks', why: 'Apply skills to projects',
  },
  {
    title: 'Advanced ML', level: 'Advanced', length: '8 weeks', why: 'Prepare for ML roles',
  },
];

const PathwayCoursesContainer = ({
  onBackToOnboarding,
  onBackToProfile,
}: PathwayCoursesContainerProps) => {
  const intl = useIntl();
  const { registerActions, clearActions } = usePathwaysActionBar();

  const handleBackToOnboarding = useCallback(() => {
    onBackToOnboarding?.();
  }, [onBackToOnboarding]);

  const handleBackToProfile = useCallback(() => {
    onBackToProfile?.();
  }, [onBackToProfile]);

  useEffect(() => {
    registerActions({
      primary: {
        id: 'pathway-adjust',
        label: messages.adjustMyPathway,
        variant: 'secondary',
        type: 'button',
        onClick: handleBackToOnboarding,
        testId: 'pathway-adjust-button',
      },
      secondary: [
        {
          id: 'pathway-view-profile',
          label: messages.viewProfile,
          variant: 'secondary',
          type: 'button',
          onClick: handleBackToProfile,
          testId: 'pathway-view-profile-button',
        },
        {
          id: 'pathway-view-quiz',
          label: messages.viewOnboardingQuiz,
          variant: 'tertiary',
          type: 'button',
          onClick: handleBackToOnboarding,
          testId: 'pathway-view-onboarding-button',
        },
      ],
      alignment: 'split',
    });
    return () => clearActions();
  }, [handleBackToOnboarding, handleBackToProfile, registerActions, clearActions, intl]);

  return (
    <section data-testid="pathway-container">
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
      </Container>
    </section>
  );
};

export default PathwayCoursesContainer;
