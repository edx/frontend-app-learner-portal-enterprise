import React, {
  useCallback, useEffect, useMemo, useRef, useState,
} from 'react';
import { useShallow } from 'zustand/react/shallow';
import { ArrowBack } from '@openedx/paragon/icons';
import { getConfig } from '@edx/frontend-platform/config';

import CareerSelectionPage from './career-selection/CareerSelectionPage';
import type { GoalSummaryFormValues } from './career-selection/GoalSummaryCard';
import { getCareerActionState, isPathwayEdited } from './career-selection/careerActionState';
import { deriveSelectedCareer } from './career-selection/selectors';
import { CAREER_SELECTION_STUB_MATCHES, CAREER_SELECTION_STUB_PROFILE } from './career-selection/fixtures';
import careerMessages from './career-selection/messages';
import { usePathwaysController, usePathwaysRequestState, usePathwaysAnalytics } from './hooks';
import {
  computePathwayInputFingerprint,
  orderDisplayableCareerMatches,
  recommendedSkillsForCareer,
  usePathwaysCourses,
  usePathwaysStore,
} from './state';
import type { PathwayGenerationRequest } from './state';
import { usePathwaysActionBar } from './action-bar';
import type { PathwaysAction } from './action-bar';
import { buildGiveFeedbackAction } from './shared';

export interface CareerSelectionContainerProps {
  onNext?: () => void;
  /** Opens the shared retake-quiz confirmation modal, owned by LearnerPathwaysTab. */
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
    })),
  );

  const {
    trackCareerSelected, trackSkillUpdated, trackProfileGenerationCompleted,
    trackBuildRequested, trackBuildCompleted, trackControlInteracted, trackFeedbackLinkClicked,
  } = usePathwaysAnalytics();

  // Narrow selector: only subscribes to course count, not full array.
  const pathwayCourses = usePathwaysCourses();
  const hasExistingPathway = pathwayCourses.length > 0;
  const feedbackFormUrl = getConfig().PATHWAYS_FEEDBACK_FORM_URL;

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

  // Modal state lifted from CareerSelectionPage.
  const [isOverwriteOpen, setIsOverwriteOpen] = useState(false);
  const [isNoCoursesOpen, setIsNoCoursesOpen] = useState(false);

  // Mirrors CareerSelectionPage's local isEditing state (Goal Summary edit form),
  // so the build button can be disabled while the learner is mid-edit.
  const [isEditingGoalSummary, setIsEditingGoalSummary] = useState(false);

  // Before any real profile/career-matches commit exists, the page displays stub
  // data so there's something to interact with. `learnerIntent` never needs a stub —
  // it's populated directly from Intake — but `learnerProfile` does. Since Intake
  // submission now always generates a real profile first (see LearnerPathwaysTab's
  // handleIntakeSubmit), this is a legacy/edge-case path only — a pathway that predates
  // this feature, or a hydrated blob reached without a completed real submission — not
  // the everyday first-visit shape.
  const usesStubData = learnerProfile === null && careerMatches.length === 0;
  const effectiveLearnerProfile = learnerProfile ?? CAREER_SELECTION_STUB_PROFILE;
  const displayedMatches = usesStubData ? CAREER_SELECTION_STUB_MATCHES : careerMatches;

  // Same displayable order CareerSelectionPage renders from, so the two can never
  // disagree about which career counts as "selected" before the learner has clicked one.
  const displayableMatches = useMemo(
    () => orderDisplayableCareerMatches(displayedMatches),
    [displayedMatches],
  );

  const selectedCareer = useMemo(
    () => deriveSelectedCareer(displayableMatches, selectedCareerId),
    [displayableMatches, selectedCareerId],
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
  // Closes a narrow race isPathwayPending alone can't: it's captured at render time, so
  // two synchronous buildPathway invocations with no re-render between them would both
  // read the same stale value. This ref is checked/set synchronously instead.
  const isBuildingRef = useRef(false);
  const displayedCareerActionStateRef = useRef(rawCareerActionState);
  if (!isPathwayPending) {
    displayedCareerActionStateRef.current = rawCareerActionState;
  }
  const careerActionState = isPathwayPending
    ? displayedCareerActionStateRef.current
    : rawCareerActionState;

  const handleSelectCareer = useCallback((careerId: string) => {
    // `selectedCareer`/`selectedCareerId` here still reflect the PREVIOUS selection —
    // selectCareer(...) below updates the store, but React hasn't re-rendered yet, so
    // usePathwaysAnalytics()'s own common-context selectors are still stale at this point
    // in the callback. Every field describing the NEW selection is passed explicitly so it
    // overrides the stale common-context value in the merged payload.
    const previousSelectedCareerId = selectedCareer?.id ?? null;
    const previousSelectedCareerName = selectedCareer?.title ?? null;
    const career = displayedMatches.find((match) => match.id === careerId);
    const selectedCareerPosition = displayableMatches.findIndex((match) => match.id === careerId);
    selectCareer(careerId, recommendedSkillsForCareer(displayedMatches, careerId) ?? undefined);
    trackCareerSelected({
      selectedCareerId: careerId,
      selectedCareerName: career?.title ?? null,
      selectedCareerPosition: selectedCareerPosition >= 0 ? selectedCareerPosition : null,
      matchPercentage: career?.matchPercentage ?? null,
      skillsToDevelopCount: career?.skillsToDevelop?.length ?? 0,
      previousSelectedCareerId,
      previousSelectedCareerName,
    });
  }, [selectCareer, displayedMatches, displayableMatches, selectedCareer, trackCareerSelected]);

  const handleDismissSkill = useCallback((skill: string) => {
    removeSelectedSkill(skill, recommendedSkills);
    trackSkillUpdated({
      action: 'dismissed',
      skill,
      selectedCareerId: selectedCareer?.id ?? null,
      selectedCareerName: selectedCareer?.title ?? null,
      suggestedSkillCount: recommendedSkills.length,
      selectedSkillCount: displayedSelectedSkills.length - 1,
      dismissedSkillCount: dismissedSkillCount + 1,
    });
  }, [
    removeSelectedSkill, recommendedSkills, selectedCareer, dismissedSkillCount,
    displayedSelectedSkills, trackSkillUpdated,
  ]);

  const handleRestoreSkills = useCallback(() => {
    restoreSelectedSkills(recommendedSkills);
    trackSkillUpdated({
      action: 'restored',
      selectedCareerId: selectedCareer?.id ?? null,
      selectedCareerName: selectedCareer?.title ?? null,
      suggestedSkillCount: recommendedSkills.length,
      selectedSkillCount: recommendedSkills.length,
      dismissedSkillCount: 0,
    });
  }, [restoreSelectedSkills, recommendedSkills, selectedCareer, trackSkillUpdated]);

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
      trackProfileGenerationCompleted({
        source: 'goal_summary_edit',
        outcome: result.careerMatches.length === 0 ? 'no_matches' : 'succeeded',
        careerMatchCount: result.careerMatches.length,
        displayableCareerMatchCount: orderDisplayableCareerMatches(result.careerMatches).length,
        careerMatchIds: result.careerMatches.slice(0, 10).map((match) => match.id),
        intentSkillsCount: result.learnerProfile.skills.length,
        skillsRequiredCount: result.skillsRequiredCount,
        skillsPreferredCount: result.skillsPreferredCount,
      });
      resolveProfile();
    } catch (error) {
      trackProfileGenerationCompleted({ source: 'goal_summary_edit', outcome: 'failed' });
      failProfile(errorMessage(error, 'Unable to update the learner profile.'));
      throw error;
    }
  };

  // buildPathway composes the explicit PathwayGenerationRequest, builds its
  // fingerprint, and commits the result atomically via commitPathwayBuild (courses +
  // fingerprint together — see state/pathwaysStore.ts). Recommendation Feedback cannot
  // run before course retrieval returns candidates; generatePathwayWorkflow owns
  // that ordering (see its own file for the Catalog Retrieval -> Recommendation
  // Feedback sequencing).
  const buildPathway = useCallback(async () => {
    if (!selectedCareer || isPathwayPending || isBuildingRef.current) {
      return;
    }
    isBuildingRef.current = true;

    // Building from the legacy stub-display state (no real profile-generation commit
    // has ever happened — see usesStubData above) durably persists the stub
    // profile/matches now, mirroring what a real generation would have produced.
    // Without this, learnerProfile/careerMatches stay null/empty forever and every
    // future render/refresh leans on the display-only stub fallback
    // (usesStubData/effectiveLearnerProfile, above) instead of real store data. Guarded
    // on usesStubData so this only ever fires once — after this commit, learnerProfile
    // is non-null, so usesStubData is naturally false on any rebuild.
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

    // Read from the same ref the trailing button freezes its label/variant against
    // (see displayedCareerActionStateRef above) rather than the `careerActionState`
    // variable directly — this callback's own dependency array doesn't include it, so
    // closing over the variable would capture a stale value from whenever this
    // useCallback instance was created.
    const careerActionStateAtRequest = displayedCareerActionStateRef.current;
    trackBuildRequested({
      careerActionState: careerActionStateAtRequest,
      selectedCareerId: selectedCareer.id,
      selectedCareerName: selectedCareer.title,
      selectedSkillCount: skillsForBuild.length,
      intentSkillsCount: effectiveLearnerProfile.skills.length,
    });

    const request: PathwayGenerationRequest = {
      learnerIntent,
      learnerProfile: effectiveLearnerProfile,
      selectedCareerId: selectedCareer.id,
      selectedSkills: skillsForBuild,
    };

    try {
      const result = await generatePathway(request, selectedCareer);
      if (result.courses.length === 0) {
        // Expected edge state, not a rejected request: end the pending state without
        // committing courses/fingerprint or navigating, and let the learner adjust
        // their inputs instead. A prior existing pathway (if this was a rebuild) is
        // left untouched since commitPathwayBuild is never called.
        resolvePathway();
        setIsNoCoursesOpen(true);
        trackBuildCompleted({
          outcome: 'empty',
          careerActionState: careerActionStateAtRequest,
          selectedCareerId: selectedCareer.id,
          selectedCareerName: selectedCareer.title,
        });
        return;
      }
      commitPathwayBuild({
        courses: result.courses,
        fingerprint: computePathwayInputFingerprint(request),
      });
      trackBuildCompleted({
        outcome: 'succeeded',
        careerActionState: careerActionStateAtRequest,
        selectedCareerId: selectedCareer.id,
        selectedCareerName: selectedCareer.title,
        courseCount: result.courses.length,
        courseKeys: result.courses.slice(0, 5).map((course) => course.courseKey),
        coursesWithExplanationsCount: result.courses.filter((course) => Boolean(course.whyThisFitsYou)).length,
      });
      resolvePathway();
      onNext?.();
    } catch (error) {
      trackBuildCompleted({
        outcome: 'failed',
        careerActionState: careerActionStateAtRequest,
        selectedCareerId: selectedCareer.id,
        selectedCareerName: selectedCareer.title,
      });
      failPathway(errorMessage(error, 'Unable to build the learning pathway.'));
    } finally {
      isBuildingRef.current = false;
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
    trackBuildRequested,
    trackBuildCompleted,
  ]);

  // Navigate to the existing pathway without building/rebuilding it.
  const viewExistingPathway = useCallback(() => {
    onNext?.();
  }, [onNext]);

  const openRebuildModal = useCallback(() => {
    setIsOverwriteOpen(true);
    trackControlInteracted({ sourceComponent: 'overwrite_pathway_modal', interactionAction: 'opened' });
  }, [trackControlInteracted]);
  const closeRebuildModal = useCallback(() => {
    setIsOverwriteOpen(false);
    trackControlInteracted({ sourceComponent: 'overwrite_pathway_modal', interactionAction: 'cancelled' });
  }, [trackControlInteracted]);

  const closeNoCoursesModal = useCallback(() => setIsNoCoursesOpen(false), []);

  // Only the true (opened) transition is tracked — `onEditingChange(false)` fires both on
  // an explicit Cancel click AND after a successful submit closes the form, and those two
  // outcomes aren't distinguishable at this boundary. The successful-submit case is
  // already captured by PROFILE_GENERATION_COMPLETED (source: 'goal_summary_edit'), so
  // tracking every `false` here would risk mislabeling a success as a cancellation.
  const handleEditingChange = useCallback((isEditing: boolean) => {
    if (isEditing) {
      trackControlInteracted({ sourceComponent: 'goal_summary_card', interactionAction: 'opened' });
    }
    setIsEditingGoalSummary(isEditing);
  }, [trackControlInteracted]);

  const isProfileSubmitting = profileRequestState.status === 'pending';

  // Trailing action-bar buttons, state-dependent per the Career Profile action matrix.
  // "Give feedback" is a plain external link (not a button/modal trigger), so it's
  // prepended ahead of the state-dependent buttons below rather than participating in
  // that branching.
  const trailingActions = useMemo((): PathwaysAction[] => {
    const giveFeedbackAction = buildGiveFeedbackAction(
      feedbackFormUrl,
      () => trackFeedbackLinkClicked({ feedbackSurface: 'career_selection' }),
    );
    const leadingActions = giveFeedbackAction ? [giveFeedbackAction] : [];
    if (careerActionState === 'new-pathway') {
      return [
        ...leadingActions,
        {
          id: 'career-build-pathway',
          label: careerMessages.buildPathway,
          loadingLabel: careerMessages.buildingPathway,
          variant: 'primary',
          type: 'button',
          disabled: !selectedCareer || isPathwayPending || isProfileSubmitting || isEditingGoalSummary,
          loading: isPathwayPending,
          onClick: buildPathway,
          buttonRef: buildButtonRef,
          testId: 'career-build-pathway-button',
        }];
    }
    if (careerActionState === 'existing-pathway-unchanged') {
      return [
        ...leadingActions,
        {
          id: 'career-build-pathway',
          label: careerMessages.buildPathway,
          variant: 'primary',
          type: 'button',
          disabled: isPathwayPending || isProfileSubmitting || isEditingGoalSummary,
          onClick: viewExistingPathway,
          buttonRef: buildButtonRef,
          testId: 'career-build-pathway-button',
        }];
    }
    // existing-pathway-edited
    return [
      ...leadingActions,
      {
        id: 'career-view-current-pathway',
        label: careerMessages.viewCurrentPathway,
        variant: 'outline-primary',
        type: 'button',
        disabled: isPathwayPending || isEditingGoalSummary,
        onClick: viewExistingPathway,
        testId: 'career-view-current-pathway-button',
      },
      {
        id: 'career-rebuild-pathway',
        label: careerMessages.rebuildPathway,
        loadingLabel: careerMessages.buildingPathway,
        variant: 'primary',
        type: 'button',
        disabled: isPathwayPending || isProfileSubmitting || isEditingGoalSummary,
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
    isEditingGoalSummary,
    buildPathway,
    viewExistingPathway,
    openRebuildModal,
    feedbackFormUrl,
    trackFeedbackLinkClicked,
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
        onClick: onRetakeQuiz,
        testId: 'career-retake-quiz-button',
      },
      secondary: trailingActions,
      alignment: 'split',
    });
    return () => clearActions();
  }, [trailingActions, onRetakeQuiz, registerActions, clearActions]);

  return (
    <CareerSelectionPage
      learnerIntent={learnerIntent}
      careerMatches={displayedMatches}
      selectedCareerId={selectedCareerId}
      isProfileSubmitting={isProfileSubmitting}
      isCareerMatchesLoading={isProfileSubmitting && displayedMatches.length === 0}
      isBuildingPathway={isPathwayPending}
      profileError={profileRequestState.error}
      pathwayError={pathwayRequestState.error}
      onSubmitGoalSummary={submitGoalSummary}
      onSelectCareer={handleSelectCareer}
      onEditingChange={handleEditingChange}
      isOverwriteOpen={isOverwriteOpen}
      onCloseOverwrite={closeRebuildModal}
      onConfirmOverwrite={buildPathway}
      buildButtonRef={buildButtonRef}
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
