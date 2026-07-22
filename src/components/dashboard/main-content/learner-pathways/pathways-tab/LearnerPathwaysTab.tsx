import React, { useCallback, useRef, useState } from 'react';
import { Container } from '@openedx/paragon';
import PathwayBreadcrumbs from './breadcrumb/PathwayBreadcrumbs';
import { IntakePage } from './intake';
import CareerSelectionContainer from './CareerSelectionContainer';
import RetakeQuizModal from './career-selection/RetakeQuizModal';
import PathwayCoursesContainer from './PathwayCoursesContainer';
import { VIEWS } from './constants';
import { usePathwaysController, usePathwaysRequestState } from './hooks';
import { usePathwaysStore, selectors } from './state';
import type { PathwaysSection, LearnerIntent } from './state';
import { PathwaysActionBarProvider } from './action-bar';
import { clearPathwaysBannerDismissal } from '../courses-tab-alert/data/bannerDismissal';

const errorMessage = (
  error: unknown,
  fallback: string,
) => (error instanceof Error && error.message ? error.message : fallback);

const LearnerPathwaysTab = () => {
  const section = usePathwaysStore(selectors.section);
  const setSection = usePathwaysStore((state) => state.setSection);
  const commitProfileSuccess = usePathwaysStore((state) => state.commitProfileSuccess);
  const resetPathwaysState = usePathwaysStore((state) => state.resetPathwaysState);

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

  // Retake-quiz confirmation lives here (not inside CareerSelectionContainer) because it must
  // be reachable from both the Profile page's "Retake quiz" action-row button AND the
  // breadcrumb's "Onboarding Quiz" link, which is also clickable from the Pathway Courses page —
  // a page that has no retake-quiz action-row button of its own to guard this transition.
  const [isRetakeOpen, setIsRetakeOpen] = useState(false);
  const retakeTriggerRef = useRef<HTMLElement | null>(null);

  const openRetakeQuiz = useCallback(() => {
    // Captures whichever element was actually clicked (action-row button or breadcrumb link),
    // so focus restoration on cancel works regardless of the trigger source.
    retakeTriggerRef.current = document.activeElement as HTMLElement;
    setIsRetakeOpen(true);
  }, []);
  const closeRetakeQuiz = useCallback(() => setIsRetakeOpen(false), []);
  const confirmRetakeQuiz = useCallback(() => {
    setIsRetakeOpen(false);
    resetPathwaysState();
    // The Courses-tab banner's dismissal is stored outside this store (localStorage,
    // not Zustand) — clear it here, alongside the reset, so the banner starts fresh.
    clearPathwaysBannerDismissal();
    setSection('onboarding');
  }, [resetPathwaysState, setSection]);

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
          onNavigate={(v: PathwaysSection) => (
            v === VIEWS.ONBOARDING ? openRetakeQuiz() : setSection(v)
          )}
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
            <CareerSelectionContainer onNext={handleNext} onRetakeQuiz={openRetakeQuiz} />
          )}
          {section === VIEWS.PATHWAY && (
            <PathwayCoursesContainer onBackToProfile={handleBackToProfile} />
          )}
        </Container>
      </div>
      <RetakeQuizModal
        isOpen={isRetakeOpen}
        onClose={closeRetakeQuiz}
        onConfirm={confirmRetakeQuiz}
        triggerRef={retakeTriggerRef}
      />
    </PathwaysActionBarProvider>
  );
};

export default LearnerPathwaysTab;
