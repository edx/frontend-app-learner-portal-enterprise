import React, {
  useCallback, useEffect, useMemo, useRef, useState,
} from 'react';
import { useSearchParams } from 'react-router-dom';
import { Container } from '@openedx/paragon';
import { useIntl } from '@edx/frontend-platform/i18n';
import PathwayBreadcrumbs from './breadcrumb/PathwayBreadcrumbs';
import { IntakePage } from './intake';
import intakeMessages from './intake/messages';
import CareerSelectionContainer from './CareerSelectionContainer';
import RetakeQuizModal from './career-selection/RetakeQuizModal';
import PathwayCoursesContainer from './PathwayCoursesContainer';
import { VIEWS } from './constants';
import { hasPathwaysFlowConflict, parsePathwaysFlowVariant } from './flowVariant';
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
  const pathwayGenerationMode = usePathwaysStore(selectors.pathwayGenerationMode);
  const setSection = usePathwaysStore((state) => state.setSection);
  const commitProfileSuccess = usePathwaysStore((state) => state.commitProfileSuccess);
  const commitSkillsPathwaySuccess = usePathwaysStore((state) => state.commitSkillsPathwaySuccess);
  const resetPathwaysState = usePathwaysStore((state) => state.resetPathwaysState);
  const intl = useIntl();

  const {
    setNavigationSource, trackStepViewed, trackIntakeSubmitted,
    trackProfileGenerationCompleted, trackQuizRetaken, trackControlInteracted,
  } = usePathwaysAnalytics();

  const { generateProfile, generateSkillsPathway } = usePathwaysController();
  const {
    profile: intakeProfileRequestState,
    beginProfile: beginIntakeProfile,
    resolveProfile: resolveIntakeProfile,
    failProfile: failIntakeProfile,
  } = usePathwaysRequestState();
  const isIntakeProfileSubmitting = intakeProfileRequestState.status === 'pending';
  const intakeProfileError = intakeProfileRequestState.error;

  // Experiment selection only (ADR 0020: not step/navigation state) — read once at
  // Intake submission time, never written back to the URL.
  const [searchParams] = useSearchParams();
  const flowVariant = useMemo(() => parsePathwaysFlowVariant(searchParams), [searchParams]);

  // A pure render-time override, never a `setSection` call: the variant is a live one-shot
  // URL input (ADR 0020), so flipping it must not durably rewrite committed state. The
  // persisted pathway stays intact and reappears the moment the matching variant is used
  // again — whereas demoting `section` in the store would be irreversible, since
  // `normalizePathwaysState` only ever demotes sections, never promotes them.
  const resolvedSection: PathwaysSection = hasPathwaysFlowConflict({
    section, pathwayGenerationMode, flowVariant,
  })
    ? VIEWS.ONBOARDING
    : section;

  // ADR 0020: pathway step changes must be tracked explicitly since `section` isn't
  // reflected in the URL. Dedup and isResumedSession are handled inside trackStepViewed
  // itself (the coordinator owns those refs); navigationSource is set by each setSection
  // call site below immediately before the section actually changes. Intentionally keyed
  // on the store's actual `section`, not `resolvedSection`: during a flow-variant
  // conflict, no store mutation happens, so there is nothing new to report — the
  // rendered Intake reflects a pure display override, not a real step transition.
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

    if (flowVariant === 'skills') {
      try {
        const { courses } = await generateSkillsPathway(values);
        if (courses.length === 0) {
          // A valid request that matched nothing catalog-eligible is not a failure: stay
          // on Intake with explanatory copy so the learner can broaden their answers and
          // resubmit. Deliberately not rethrown — nothing failed.
          failIntakeProfile(intl.formatMessage(intakeMessages.noEligibleSkillsCourses));
          return;
        }
        commitSkillsPathwaySuccess({ courses });
        resolveIntakeProfile();
        setNavigationSource('workflow_completion');
        // Straight to 'pathway': skills mode has no Career Profile step.
        setSection(VIEWS.PATHWAY);
      } catch (error) {
        failIntakeProfile(errorMessage(error, 'Unable to generate your recommendations.'));
        throw error;
      }
      return;
    }

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
    flowVariant,
    beginIntakeProfile,
    generateProfile,
    generateSkillsPathway,
    commitProfileSuccess,
    commitSkillsPathwaySuccess,
    resolveIntakeProfile,
    setSection,
    setNavigationSource,
    failIntakeProfile,
    trackIntakeSubmitted,
    trackProfileGenerationCompleted,
    intl,
  ]);

  return (
    <PathwaysActionBarProvider>
      <div data-testid="learner-pathways-tab-scaffold">
        <PathwayBreadcrumbs
          view={resolvedSection}
          flowVariant={flowVariant}
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
          {resolvedSection === VIEWS.ONBOARDING && (
            <IntakePage
              onSubmit={handleIntakeSubmit}
              flowVariant={flowVariant}
              isProfileSubmitting={isIntakeProfileSubmitting}
              profileError={intakeProfileError}
            />
          )}
          {resolvedSection === VIEWS.PROFILE && (
            <CareerSelectionContainer onNext={handleNext} onRetakeQuiz={openRetakeQuiz} />
          )}
          {resolvedSection === VIEWS.PATHWAY && (
            <PathwayCoursesContainer
              flowVariant={flowVariant}
              onBackToProfile={handleBackToProfile}
              onOpenRetakeQuiz={openRetakeQuiz}
            />
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
