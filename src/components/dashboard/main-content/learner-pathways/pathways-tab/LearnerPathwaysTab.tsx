import React, { useCallback } from 'react';
import { Container } from '@openedx/paragon';
import PathwayBreadcrumbs from './breadcrumb/PathwayBreadcrumbs';
import { IntakePage } from './intake';
import CareerSelectionContainer from './CareerSelectionContainer';
import PathwayCoursesContainer from './PathwayCoursesContainer';
import { VIEWS } from './constants';
import { usePathwaysController, usePathwaysRequestState } from './hooks';
import { usePathwaysStore, selectors } from './state';
import type { PathwaysSection, LearnerIntent } from './state';
import { PathwaysActionBarProvider } from './action-bar';

const errorMessage = (
  error: unknown,
  fallback: string,
) => (error instanceof Error && error.message ? error.message : fallback);

const LearnerPathwaysTab = () => {
  const section = usePathwaysStore(selectors.section);
  const setSection = usePathwaysStore((state) => state.setSection);
  const commitProfileSuccess = usePathwaysStore((state) => state.commitProfileSuccess);

  const { generateProfile } = usePathwaysController();
  const {
    profile: intakeProfileRequestState,
    beginProfile: beginIntakeProfile,
    resolveProfile: resolveIntakeProfile,
    failProfile: failIntakeProfile,
  } = usePathwaysRequestState();
  const isIntakeProfileSubmitting = intakeProfileRequestState.status === 'pending';
  const intakeProfileError = intakeProfileRequestState.error;

  const handleBackToProfile = useCallback(() => setSection('profile'), [setSection]);
  const handleNext = useCallback(() => setSection('pathway'), [setSection]);
  const handleRetakeQuiz = useCallback(() => setSection('onboarding'), [setSection]);

  const handleIntakeSubmit = useCallback(async (values: LearnerIntent) => {
    if (isIntakeProfileSubmitting) {
      return;
    }
    beginIntakeProfile();
    try {
      const result = await generateProfile(values);
      commitProfileSuccess({
        learnerIntent: values,
        learnerProfile: result.learnerProfile,
        careerMatches: result.careerMatches,
      });
      resolveIntakeProfile();
      setSection('profile');
    } catch (error) {
      failIntakeProfile(errorMessage(error, 'Unable to generate your learner profile.'));
      throw error;
    }
  }, [
    isIntakeProfileSubmitting,
    beginIntakeProfile,
    generateProfile,
    commitProfileSuccess,
    resolveIntakeProfile,
    setSection,
    failIntakeProfile,
  ]);

  return (
    <PathwaysActionBarProvider>
      <div data-testid="learner-pathways-tab-scaffold">
        <PathwayBreadcrumbs
          view={section}
          onNavigate={(v: PathwaysSection) => setSection(v)}
        />
        <Container size="md" fluid className="mt-4.5">
          {section === VIEWS.ONBOARDING && (
            <IntakePage
              onSubmit={handleIntakeSubmit}
              isProfileSubmitting={isIntakeProfileSubmitting}
              profileError={intakeProfileError}
            />
          )}
          {section === VIEWS.PROFILE && (
            <CareerSelectionContainer onNext={handleNext} onRetakeQuiz={handleRetakeQuiz} />
          )}
          {section === VIEWS.PATHWAY && (
            <PathwayCoursesContainer onBackToProfile={handleBackToProfile} />
          )}
        </Container>
      </div>
    </PathwaysActionBarProvider>
  );
};

export default LearnerPathwaysTab;
