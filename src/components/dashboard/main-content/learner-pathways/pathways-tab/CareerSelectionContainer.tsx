import React, {
  useCallback, useEffect, useMemo, useRef, useState,
} from 'react';
import { useShallow } from 'zustand/react/shallow';
import { ArrowBack } from '@openedx/paragon/icons';

import CareerSelectionPage from './career-selection/CareerSelectionPage';
import type { GoalSummaryFormValues } from './career-selection/GoalSummaryCard';
import { getCareerActionState, isPathwayEdited } from './career-selection/careerActionState';
import { deriveSelectedCareer } from './career-selection/selectors';
import { CAREER_SELECTION_STUB_MATCHES, CAREER_SELECTION_STUB_PROFILE } from './career-selection/fixtures';
import careerMessages from './career-selection/messages';
import { usePathwaysController, usePathwaysRequestState } from './hooks';
import {
  computePathwayInputFingerprint,
  recommendedSkillsForCareer,
  usePathwaysCourses,
  usePathwaysStore,
} from './state';
import type { PathwayGenerationRequest } from './state';
import { usePathwaysActionBar } from './action-bar';
import type { PathwaysAction } from './action-bar';

export interface CareerSelectionContainerProps {
  onNext?: () => void;
  onRetakeQuiz?: () => void;
}

const errorMessage = (
  error: unknown,
  fallback: string,
) => (error instanceof Error && error.message ? error.message : fallback);

/** UI adapter to the learner-pathways store/controller/workflow seams. */
const CareerSelectionContainer = ({
  onNext,
  onRetakeQuiz,
}: CareerSelectionContainerProps) => {
  const {
    learnerIntent,
    learnerProfile,
    careerMatches,
    selectedCareerId,
    selectedSkills,
    pathwayInputFingerprint,
    selectCareer,
    removeSelectedSkill,
    restoreSelectedSkills,
    commitProfileSuccess,
    commitPathwayBuild,
    commitStubProfile,
    resetPathwaysState,
  } = usePathwaysStore(
    useShallow((state) => ({
      learnerIntent: state.learnerIntent,
      learnerProfile: state.learnerProfile,
      careerMatches: state.careerMatches,
      selectedCareerId: state.selectedCareerId,
      selectedSkills: state.selectedSkills,
      pathwayInputFingerprint: state.pathwayInputFingerprint,
      selectCareer: state.selectCareer,
      removeSelectedSkill: state.removeSelectedSkill,
      restoreSelectedSkills: state.restoreSelectedSkills,
      commitProfileSuccess: state.commitProfileSuccess,
      commitPathwayBuild: state.commitPathwayBuild,
      commitStubProfile: state.commitStubProfile,
      resetPathwaysState: state.resetPathwaysState,
    })),
  );

  // Narrow selector: only subscribes to course count, not full array.
  const pathwayCourses = usePathwaysCourses();
  const hasExistingPathway = pathwayCourses.length > 0;

  const {
    profile: profileRequestState,
    pathway: pathwayRequestState,
    beginProfile,
    resolveProfile,
    failProfile,
    beginPathway,
    resolvePathway,
    failPathway,
  } = usePathwaysRequestState();
  const { generateProfile, generatePathway } = usePathwaysController();
  const { registerActions, clearActions } = usePathwaysActionBar();

  // Ref shared between the portaled build/rebuild button and OverwritePathwayModal.
  const buildButtonRef = useRef<HTMLButtonElement>(null);
  // Ref shared between the portaled retake-quiz button and RetakeQuizModal.
  const retakeButtonRef = useRef<HTMLButtonElement>(null);

  // Modal state lifted from CareerSelectionPage.
  const [isOverwriteOpen, setIsOverwriteOpen] = useState(false);
  const [isRetakeOpen, setIsRetakeOpen] = useState(false);
  const [isNoCoursesOpen, setIsNoCoursesOpen] = useState(false);

  // Before any real profile/career-matches commit exists, the page displays stub
  // data so there's something to interact with. `learnerIntent` never needs a stub —
  // it's populated directly from Intake — but `learnerProfile` does, since pathway
  // building can happen (State A tests) before Goal Summary is ever submitted.
  const usesStubData = learnerProfile === null && careerMatches.length === 0;
  const effectiveLearnerProfile = learnerProfile ?? CAREER_SELECTION_STUB_PROFILE;
  const displayedMatches = usesStubData ? CAREER_SELECTION_STUB_MATCHES : careerMatches;

  const selectedCareer = useMemo(
    () => deriveSelectedCareer(displayedMatches, selectedCareerId),
    [displayedMatches, selectedCareerId],
  );

  // The career's recommended list as currently displayed (stub-or-real) — used both
  // to seed the store the first time a career is interacted with, and to compute how
  // many skills have been dismissed from it.
  const recommendedSkills = useMemo(
    () => recommendedSkillsForCareer(displayedMatches, selectedCareer?.id ?? null) ?? [],
    [displayedMatches, selectedCareer],
  );

  // The canonical selected-skills list lives in the store; fall back to the full
  // recommended list only when the store hasn't initialized one yet (e.g. the
  // pre-generation stub-display career, before any career/profile commit). Every
  // mutation path (selectCareer, commitProfileSuccess) re-initializes `selectedSkills`
  // atomically whenever the resolved career actually changes, so a non-null value here
  // is always trustworthy for whichever career is currently displayed — no additional
  // "does this still match the selected career id" guard is needed.
  const displayedSelectedSkills = selectedSkills ?? recommendedSkills;
  const dismissedSkillCount = Math.max(0, recommendedSkills.length - displayedSelectedSkills.length);

  const currentRequest: PathwayGenerationRequest | null = useMemo(() => {
    if (!selectedCareerId) {
      return null;
    }
    return {
      learnerIntent,
      learnerProfile: effectiveLearnerProfile,
      selectedCareerId,
      selectedSkills: displayedSelectedSkills,
    };
  }, [learnerIntent, effectiveLearnerProfile, selectedCareerId, displayedSelectedSkills]);

  const isEdited = useMemo(
    () => (currentRequest ? isPathwayEdited(pathwayInputFingerprint, currentRequest) : false),
    [currentRequest, pathwayInputFingerprint],
  );

  const rawCareerActionState = getCareerActionState({ hasExistingPathway, isEdited });
  // Freeze the displayed action state for the duration of an in-flight build/rebuild so
  // the trailing button's label/variant can't change out from under the learner mid-spin.
  const isPathwayPending = pathwayRequestState.status === 'pending';
  const displayedCareerActionStateRef = useRef(rawCareerActionState);
  if (!isPathwayPending) {
    displayedCareerActionStateRef.current = rawCareerActionState;
  }
  const careerActionState = isPathwayPending
    ? displayedCareerActionStateRef.current
    : rawCareerActionState;

  const handleSelectCareer = useCallback((careerId: string) => {
    selectCareer(careerId, recommendedSkillsForCareer(displayedMatches, careerId) ?? undefined);
  }, [selectCareer, displayedMatches]);

  const handleDismissSkill = useCallback((skill: string) => {
    removeSelectedSkill(skill, recommendedSkills);
  }, [removeSelectedSkill, recommendedSkills]);

  const handleRestoreSkills = useCallback(() => {
    restoreSelectedSkills(recommendedSkills);
  }, [restoreSelectedSkills, recommendedSkills]);

  // Atomically commits the profile/career-matches success result — see
  // state/pathwaysStore.ts:commitProfileSuccess. Always replaces career matches
  // and the submitted intent, and re-validates the selected career against them.
  const submitGoalSummary = async (updates: GoalSummaryFormValues) => {
    beginProfile();
    try {
      const result = await generateProfile(updates);
      commitProfileSuccess({
        learnerIntent: updates,
        learnerProfile: result.learnerProfile,
        careerMatches: result.careerMatches,
      });
      resolveProfile();
    } catch (error) {
      failProfile(errorMessage(error, 'Unable to update the learner profile.'));
      throw error;
    }
  };

  // buildPathway composes the explicit PathwayGenerationRequest, builds its
  // fingerprint, and commits the result atomically via commitPathwayBuild (courses +
  // fingerprint together — see state/pathwaysStore.ts). Recommendation Feedback cannot
  // run before course retrieval returns candidates; generatePathwayWorkflow owns
  // that ordering once real Algolia/Recommendation Feedback integration lands.
  const buildPathway = useCallback(async () => {
    if (!selectedCareer || isPathwayPending) {
      return;
    }

    // Building from State A (stub display, no Goal Summary ever submitted) durably
    // persists the stub profile/matches now, mirroring what a real Goal Summary
    // submission would have produced. Without this, learnerProfile/careerMatches stay
    // null/empty forever and every future render/refresh leans on the display-only
    // stub fallback (usesStubData/effectiveLearnerProfile, above) instead of real store
    // data. Guarded on usesStubData so this only ever fires once — after this commit,
    // learnerProfile is non-null, so usesStubData is naturally false on any rebuild.
    if (usesStubData) {
      commitStubProfile({
        learnerProfile: CAREER_SELECTION_STUB_PROFILE,
        careerMatches: CAREER_SELECTION_STUB_MATCHES,
      });
    }

    const skillsForBuild = selectedSkills ?? recommendedSkills;
    selectCareer(selectedCareer.id, skillsForBuild);
    setIsOverwriteOpen(false);
    beginPathway();

    const request: PathwayGenerationRequest = {
      learnerIntent,
      learnerProfile: effectiveLearnerProfile,
      selectedCareerId: selectedCareer.id,
      selectedSkills: skillsForBuild,
    };

    try {
      const result = await generatePathway(request);
      if (result.courses.length === 0) {
        // Expected edge state, not a rejected request: end the pending state without
        // committing courses/fingerprint or navigating, and let the learner adjust
        // their inputs instead. A prior existing pathway (if this was a rebuild) is
        // left untouched since commitPathwayBuild is never called.
        resolvePathway();
        setIsNoCoursesOpen(true);
        return;
      }
      commitPathwayBuild({
        courses: result.courses,
        fingerprint: computePathwayInputFingerprint(request),
      });
      resolvePathway();
      onNext?.();
    } catch (error) {
      failPathway(errorMessage(error, 'Unable to build the learning pathway.'));
    }
  }, [
    selectedCareer,
    isPathwayPending,
    usesStubData,
    commitStubProfile,
    selectedSkills,
    recommendedSkills,
    selectCareer,
    learnerIntent,
    effectiveLearnerProfile,
    generatePathway,
    commitPathwayBuild,
    onNext,
    beginPathway,
    resolvePathway,
    failPathway,
  ]);

  // Navigate to the existing pathway without building/rebuilding it.
  const viewExistingPathway = useCallback(() => {
    onNext?.();
  }, [onNext]);

  const openRetakeQuiz = useCallback(() => setIsRetakeOpen(true), []);
  const closeRetakeQuiz = useCallback(() => setIsRetakeOpen(false), []);
  const confirmRetakeQuiz = useCallback(() => {
    setIsRetakeOpen(false);
    resetPathwaysState();
    onRetakeQuiz?.();
  }, [onRetakeQuiz, resetPathwaysState]);

  const openRebuildModal = useCallback(() => setIsOverwriteOpen(true), []);
  const closeRebuildModal = useCallback(() => setIsOverwriteOpen(false), []);

  const closeNoCoursesModal = useCallback(() => setIsNoCoursesOpen(false), []);

  const isProfileSubmitting = profileRequestState.status === 'pending';

  // Trailing action-bar buttons, state-dependent per the Career Profile action matrix.
  const trailingActions = useMemo((): PathwaysAction[] => {
    if (careerActionState === 'new-pathway') {
      return [{
        id: 'career-build-pathway',
        label: careerMessages.buildPathway,
        loadingLabel: careerMessages.buildingPathway,
        variant: 'primary',
        type: 'button',
        disabled: !selectedCareer || isPathwayPending || isProfileSubmitting,
        loading: isPathwayPending,
        onClick: buildPathway,
        buttonRef: buildButtonRef,
        testId: 'career-build-pathway-button',
      }];
    }
    if (careerActionState === 'existing-pathway-unchanged') {
      return [{
        id: 'career-build-pathway',
        label: careerMessages.buildPathway,
        variant: 'primary',
        type: 'button',
        disabled: isPathwayPending || isProfileSubmitting,
        onClick: viewExistingPathway,
        buttonRef: buildButtonRef,
        testId: 'career-build-pathway-button',
      }];
    }
    // existing-pathway-edited
    return [
      {
        id: 'career-view-current-pathway',
        label: careerMessages.viewCurrentPathway,
        variant: 'outline-primary',
        type: 'button',
        disabled: isPathwayPending,
        onClick: viewExistingPathway,
        testId: 'career-view-current-pathway-button',
      },
      {
        id: 'career-rebuild-pathway',
        label: careerMessages.rebuildPathway,
        loadingLabel: careerMessages.buildingPathway,
        variant: 'primary',
        type: 'button',
        disabled: isPathwayPending || isProfileSubmitting,
        loading: isPathwayPending,
        onClick: openRebuildModal,
        buttonRef: buildButtonRef,
        testId: 'career-rebuild-pathway-button',
      },
    ];
  }, [
    careerActionState,
    selectedCareer,
    isPathwayPending,
    isProfileSubmitting,
    buildPathway,
    viewExistingPathway,
    openRebuildModal,
  ]);

  // Register leading (Retake quiz) + trailing action-bar buttons.
  useEffect(() => {
    registerActions({
      primary: {
        id: 'career-retake-quiz',
        label: careerMessages.retakeQuiz,
        variant: 'tertiary',
        type: 'button',
        iconBefore: ArrowBack,
        onClick: openRetakeQuiz,
        buttonRef: retakeButtonRef,
        testId: 'career-retake-quiz-button',
      },
      secondary: trailingActions,
      alignment: 'split',
    });
    return () => clearActions();
  }, [trailingActions, openRetakeQuiz, registerActions, clearActions]);

  return (
    <CareerSelectionPage
      learnerIntent={learnerIntent}
      careerMatches={displayedMatches}
      selectedCareerId={selectedCareerId}
      isProfileSubmitting={isProfileSubmitting}
      isCareerMatchesLoading={isProfileSubmitting && displayedMatches.length === 0}
      isBuildingPathway={isPathwayPending}
      profileError={profileRequestState.error}
      onSubmitGoalSummary={submitGoalSummary}
      onSelectCareer={handleSelectCareer}
      isOverwriteOpen={isOverwriteOpen}
      onCloseOverwrite={closeRebuildModal}
      onConfirmOverwrite={buildPathway}
      buildButtonRef={buildButtonRef}
      isRetakeOpen={isRetakeOpen}
      onCloseRetake={closeRetakeQuiz}
      onConfirmRetake={confirmRetakeQuiz}
      retakeButtonRef={retakeButtonRef}
      isNoCoursesOpen={isNoCoursesOpen}
      onCloseNoCourses={closeNoCoursesModal}
      visibleSkills={displayedSelectedSkills}
      dismissedSkillCount={dismissedSkillCount}
      onDismissSkill={handleDismissSkill}
      onRestoreSkills={handleRestoreSkills}
    />
  );
};

export default CareerSelectionContainer;
