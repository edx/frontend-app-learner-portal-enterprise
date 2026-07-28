import React, {
  useCallback, useEffect, useRef, useState,
} from 'react';
import { Container } from '@openedx/paragon';
import { sendEnterpriseTrackEvent } from '@2uinc/frontend-enterprise-utils';
import PathwayBreadcrumbs from './breadcrumb/PathwayBreadcrumbs';
import { IntakePage } from './intake';
import CareerSelectionContainer from './CareerSelectionContainer';
import RetakeQuizModal from './career-selection/RetakeQuizModal';
import PathwayCoursesContainer from './PathwayCoursesContainer';
import { VIEWS } from './constants';
import { usePathwaysController, usePathwaysRequestState } from './hooks';
import {
  usePathwaysStore, selectors, orderDisplayableCareerMatches,
} from './state';
import type { PathwaysSection, LearnerIntent } from './state';
import { PathwaysActionBarProvider } from './action-bar';
import { clearPathwaysBannerDismissal } from '../courses-tab-alert/data/bannerDismissal';
import { useEnterpriseCustomer } from '../../../../app/data';
import { PATHWAYS_EVENTS } from '../../../../../eventTracking';

const errorMessage = (
  error: unknown,
  fallback: string,
) => (error instanceof Error && error.message ? error.message : fallback);

const LearnerPathwaysTab = () => {
  const section = usePathwaysStore(selectors.section);
  const setSection = usePathwaysStore((state) => state.setSection);
  const commitProfileSuccess = usePathwaysStore((state) => state.commitProfileSuccess);
  const resetPathwaysState = usePathwaysStore((state) => state.resetPathwaysState);

  const { data: enterpriseCustomer } = useEnterpriseCustomer();

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
  // reflected in the URL. Guarded the same way useDashboardTabs.jsx guards page-visit
  // events — a ref holding the last-tracked step, so rerenders that don't change
  // `section` never re-fire. `isResumedSession` is only meaningful on the very first
  // event of this component's lifetime (a hydrated, mid-journey `section` on mount);
  // it's always `false` afterward, once the learner is actively progressing.
  const lastTrackedStepRef = useRef<PathwaysSection | null>(null);
  const isFirstStepEventRef = useRef(true);
  useEffect(() => {
    if (lastTrackedStepRef.current === section) {
      return;
    }
    const isResumedSession = isFirstStepEventRef.current && section !== 'onboarding';
    isFirstStepEventRef.current = false;
    lastTrackedStepRef.current = section;
    sendEnterpriseTrackEvent(enterpriseCustomer?.uuid, PATHWAYS_EVENTS.STEP_VIEWED, {
      pathwayStep: section,
      isResumedSession,
    });
  }, [section, enterpriseCustomer?.uuid]);

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
    sendEnterpriseTrackEvent(enterpriseCustomer?.uuid, PATHWAYS_EVENTS.QUIZ_RETAKEN, { pathwayStep: section });
    resetPathwaysState();
    // The Courses-tab banner's dismissal is stored outside this store (localStorage,
    // not Zustand) — clear it here, alongside the reset, so the banner starts fresh.
    clearPathwaysBannerDismissal();
    setSection('onboarding');
  }, [resetPathwaysState, setSection, enterpriseCustomer?.uuid, section]);

  const handleIntakeSubmit = useCallback(async (values: LearnerIntent) => {
    if (isIntakeProfileSubmitting) {
      return;
    }
    const fieldsCompletedCount = Object.values(values).filter((value) => value.trim().length > 0).length;
    sendEnterpriseTrackEvent(enterpriseCustomer?.uuid, PATHWAYS_EVENTS.INTAKE_SUBMITTED, { fieldsCompletedCount });
    beginIntakeProfile();
    try {
      const result = await generateProfile(values);
      commitProfileSuccess({
        learnerIntent: values,
        learnerProfile: result.learnerProfile,
        careerMatches: result.careerMatches,
      });
      sendEnterpriseTrackEvent(enterpriseCustomer?.uuid, PATHWAYS_EVENTS.PROFILE_GENERATION_COMPLETED, {
        source: 'intake',
        outcome: result.careerMatches.length === 0 ? 'no_matches' : 'succeeded',
        careerMatchCount: result.careerMatches.length,
        displayableCareerMatchCount: orderDisplayableCareerMatches(result.careerMatches).length,
        careerMatchIds: result.careerMatches.slice(0, 10).map((match) => match.id),
        intentSkillsCount: result.learnerProfile.skills.length,
      });
      resolveIntakeProfile();
      setSection('profile');
    } catch (error) {
      sendEnterpriseTrackEvent(enterpriseCustomer?.uuid, PATHWAYS_EVENTS.PROFILE_GENERATION_COMPLETED, {
        source: 'intake',
        outcome: 'failed',
      });
      failIntakeProfile(errorMessage(error, 'Unable to generate your learner profile.'));
      throw error;
    }
  }, [
    isIntakeProfileSubmitting,
    enterpriseCustomer?.uuid,
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
