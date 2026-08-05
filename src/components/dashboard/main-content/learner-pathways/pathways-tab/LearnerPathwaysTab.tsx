import React, {
  useCallback, useEffect, useRef, useState,
} from 'react';
import { Container } from '@openedx/paragon';
import PathwayBreadcrumbs from './breadcrumb/PathwayBreadcrumbs';
import { IntakePage } from './intake';
import CareerSelectionContainer from './CareerSelectionContainer';
import RetakeQuizModal from './career-selection/RetakeQuizModal';
import PathwayCoursesContainer from './PathwayCoursesContainer';
import { VIEWS } from './constants';
import { usePathwaysController, usePathwaysRequestState, usePathwaysAnalytics } from './hooks';
import {
  usePathwaysStore, selectors, orderDisplayableCareerMatches,
} from './state';
import type { PathwaysSection, LearnerIntent } from './state';
import { PathwaysActionBarProvider } from './action-bar';
import { clearPathwaysBannerDismissal } from '../courses-tab-alert/data/bannerDismissal';

const errorMessage = (
  error: unknown,
  fallback: string,
) => (error instanceof Error && error.message ? error.message : fallback);

/** Bounded, privacy-safe stand-in for raw intake text length. */
const lengthCategory = (value: string): 'short' | 'medium' | 'long' => {
  const { length } = value.trim();
  if (length <= 100) {
    return 'short';
  }
  return length <= 200 ? 'medium' : 'long';
};

const LearnerPathwaysTab = () => {
  const section = usePathwaysStore(selectors.section);
  const setSection = usePathwaysStore((state) => state.setSection);
  const commitProfileSuccess = usePathwaysStore((state) => state.commitProfileSuccess);
  const resetPathwaysState = usePathwaysStore((state) => state.resetPathwaysState);

  const {
    setNavigationSource, trackStepViewed, trackIntakeSubmitted,
    trackProfileGenerationCompleted, trackQuizRetaken, trackControlInteracted,
  } = usePathwaysAnalytics();

  const { generateProfile } = usePathwaysController();
  const {
    profile: intakeProfileRequestState,
    beginProfile: beginIntakeProfile,
    resolveProfile: resolveIntakeProfile,
    failProfile: failIntakeProfile,
  } = usePathwaysRequestState();
  const isIntakeProfileSubmitting = intakeProfileRequestState.status === 'pending';
  const intakeProfileError = intakeProfileRequestState.error;

  // ADR 0020: pathway step changes must be tracked explicitly since `section` isn't
  // reflected in the URL. Dedup and isResumedSession are handled inside trackStepViewed
  // itself (the coordinator owns those refs); navigationSource is set by each setSection
  // call site below immediately before the section actually changes.
  useEffect(() => {
    trackStepViewed();
  }, [section, trackStepViewed]);

  const handleBackToProfile = useCallback(() => {
    setNavigationSource('action_bar');
    setSection('profile');
  }, [setSection, setNavigationSource]);
  const handleNext = useCallback(() => {
    setNavigationSource('workflow_completion');
    setSection('pathway');
  }, [setSection, setNavigationSource]);

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
    trackControlInteracted({ sourceComponent: 'retake_quiz_modal', interactionAction: 'opened' });
  }, [trackControlInteracted]);
  const closeRetakeQuiz = useCallback(() => {
    setIsRetakeOpen(false);
    trackControlInteracted({ sourceComponent: 'retake_quiz_modal', interactionAction: 'cancelled' });
  }, [trackControlInteracted]);
  const confirmRetakeQuiz = useCallback(() => {
    setIsRetakeOpen(false);
    trackQuizRetaken({});
    resetPathwaysState();
    // The Courses-tab banner's dismissal is stored outside this store (localStorage,
    // not Zustand) — clear it here, alongside the reset, so the banner starts fresh.
    clearPathwaysBannerDismissal();
    setNavigationSource('action_bar');
    setSection('onboarding');
  }, [resetPathwaysState, setSection, setNavigationSource, trackQuizRetaken]);

  const handleIntakeSubmit = useCallback(async (values: LearnerIntent) => {
    if (isIntakeProfileSubmitting) {
      return;
    }
    const fieldsCompletedCount = Object.values(values).filter((value) => value.trim().length > 0).length;
    trackIntakeSubmitted({
      fieldsCompletedCount,
      careerGoalLengthCategory: lengthCategory(values.careerGoal),
      targetIndustryLengthCategory: lengthCategory(values.targetIndustry),
      backgroundLengthCategory: lengthCategory(values.background),
      motivationLengthCategory: lengthCategory(values.motivation),
    });
    beginIntakeProfile();
    try {
      const result = await generateProfile(values);
      commitProfileSuccess({
        learnerIntent: values,
        learnerProfile: result.learnerProfile,
        careerMatches: result.careerMatches,
      });
      trackProfileGenerationCompleted({
        source: 'intake',
        outcome: result.careerMatches.length === 0 ? 'no_matches' : 'succeeded',
        careerMatchCount: result.careerMatches.length,
        displayableCareerMatchCount: orderDisplayableCareerMatches(result.careerMatches).length,
        careerMatchIds: result.careerMatches.slice(0, 10).map((match) => match.id),
        intentSkillsCount: result.learnerProfile.skills.length,
        skillsRequiredCount: result.skillsRequiredCount,
        skillsPreferredCount: result.skillsPreferredCount,
      });
      resolveIntakeProfile();
      setNavigationSource('workflow_completion');
      setSection('profile');
    } catch (error) {
      trackProfileGenerationCompleted({ source: 'intake', outcome: 'failed' });
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
    setNavigationSource,
    failIntakeProfile,
    trackIntakeSubmitted,
    trackProfileGenerationCompleted,
  ]);

  return (
    <PathwaysActionBarProvider>
      <div data-testid="learner-pathways-tab-scaffold">
        <PathwayBreadcrumbs
          view={section}
          onNavigate={(v: PathwaysSection) => {
            if (v === VIEWS.ONBOARDING) {
              openRetakeQuiz();
              return;
            }
            setNavigationSource('breadcrumb');
            setSection(v);
          }}
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
