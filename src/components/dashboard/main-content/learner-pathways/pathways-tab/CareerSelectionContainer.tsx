import React, {
  useCallback, useEffect, useMemo, useRef, useState,
} from 'react';
import { useShallow } from 'zustand/react/shallow';
import { ArrowBack } from '@openedx/paragon/icons';

import CareerSelectionPage from './career-selection/CareerSelectionPage';
import type { GoalSummaryFields } from './career-selection/GoalSummaryCard';
import { getCareerActionState, isPathwayEdited } from './career-selection/careerActionState';
import {
  CAREER_SELECTION_STUB_MATCHES,
  buildCareerSelectionStubProfile,
} from './career-selection/fixtures';
import careerMessages from './career-selection/messages';
import { usePathwaysController } from './hooks';
import { usePathwayBaseline, usePathwaysCourses, usePathwaysStore } from './state';
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
    onboardingAnswers,
    learnerProfile,
    careerMatches,
    selectedCareerId,
    loading,
    errors,
    setLearnerProfile,
    updateLearnerProfile,
    setCareerMatches,
    setSelectedCareerId,
    setConstructedPayload,
    setLoading,
    setError,
    setExperienceStatus,
  } = usePathwaysStore(
    useShallow((state) => ({
      onboardingAnswers: state.onboarding.answers,
      learnerProfile: state.learnerProfile,
      careerMatches: state.careerMatches,
      selectedCareerId: state.selectedCareerId,
      loading: state.loading,
      errors: state.errors,
      setLearnerProfile: state.setLearnerProfile,
      updateLearnerProfile: state.updateLearnerProfile,
      setCareerMatches: state.setCareerMatches,
      setSelectedCareerId: state.setSelectedCareerId,
      setConstructedPayload: state.setConstructedPayload,
      setLoading: state.setLoading,
      setError: state.setError,
      setExperienceStatus: state.setExperienceStatus,
    })),
  );

  // Narrow selector: only subscribes to course count, not full array.
  const pathwayCourses = usePathwaysCourses();
  const hasExistingPathway = pathwayCourses.length > 0;

  const pathwayBaseline = usePathwayBaseline();
  const setPathwayBaseline = usePathwaysStore((state) => state.setPathwayBaseline);

  const { generateProfile, generatePathway } = usePathwaysController();
  const { registerActions, clearActions } = usePathwaysActionBar();

  // Ref shared between the portaled build/rebuild button and OverwritePathwayModal.
  const buildButtonRef = useRef<HTMLButtonElement>(null);
  // Ref shared between the portaled retake-quiz button and RetakeQuizModal.
  const retakeButtonRef = useRef<HTMLButtonElement>(null);

  // Modal + skills state lifted from CareerSelectionPage.
  const [isOverwriteOpen, setIsOverwriteOpen] = useState(false);
  const [isRetakeOpen, setIsRetakeOpen] = useState(false);
  const [dismissedSkills, setDismissedSkills] = useState<Set<string>>(new Set<string>());

  const stubProfile = useMemo(
    () => buildCareerSelectionStubProfile(onboardingAnswers),
    [onboardingAnswers],
  );
  const displayedProfile = learnerProfile ?? stubProfile;
  const usesStubData = learnerProfile === null && careerMatches.length === 0;
  const displayedMatches = usesStubData
    ? CAREER_SELECTION_STUB_MATCHES
    : careerMatches;

  // Derive selected career from displayed matches; fall back to first.
  const selectedCareer = useMemo(
    () => displayedMatches.find((m) => m.id === selectedCareerId)
      ?? displayedMatches[0]
      ?? null,
    [displayedMatches, selectedCareerId],
  );

  // Available skills: career-specific first, then profile skills.
  const availableSkills = useMemo(() => {
    const raw = selectedCareer?.skillsToDevelop ?? displayedProfile.skills;
    return Array.from(new Set(raw.map((s: string) => s.trim()).filter(Boolean)));
  }, [selectedCareer, displayedProfile.skills]);

  // Reset dismissed skills whenever the career or available skill set changes.
  const availableSkillsKey = availableSkills.join('\x00');
  useEffect(() => {
    setDismissedSkills(new Set<string>());
  }, [selectedCareer?.id, availableSkillsKey]);

  const visibleSkills = useMemo(
    () => availableSkills.filter((s) => !dismissedSkills.has(s)),
    [availableSkills, dismissedSkills],
  );

  // If an existing pathway was loaded without a recorded baseline (e.g. fresh page
  // load), seed one from the current Goal Summary + selected career. This assumes
  // "no pending edits yet" as the least-surprising default (existing-pathway-unchanged),
  // since there's no other signal to determine whether edits happened before this session.
  useEffect(() => {
    if (hasExistingPathway && pathwayBaseline === null) {
      setPathwayBaseline({
        careerGoal: displayedProfile.careerGoal,
        targetIndustry: displayedProfile.targetIndustry,
        background: displayedProfile.background,
        motivation: displayedProfile.motivation,
        selectedCareerId,
      });
    }
  }, [hasExistingPathway, pathwayBaseline, displayedProfile, selectedCareerId, setPathwayBaseline]);

  const isEdited = useMemo(() => isPathwayEdited(pathwayBaseline, {
    goalSummary: {
      careerGoal: displayedProfile.careerGoal,
      targetIndustry: displayedProfile.targetIndustry,
      background: displayedProfile.background,
      motivation: displayedProfile.motivation,
    },
    selectedCareerId,
  }), [pathwayBaseline, displayedProfile, selectedCareerId]);

  const rawCareerActionState = getCareerActionState({ hasExistingPathway, isEdited });
  // Freeze the displayed action state for the duration of an in-flight build/rebuild so
  // the trailing button's label/variant can't change out from under the learner mid-spin.
  const displayedCareerActionStateRef = useRef(rawCareerActionState);
  if (!loading.pathwayCourses) {
    displayedCareerActionStateRef.current = rawCareerActionState;
  }
  const careerActionState = loading.pathwayCourses
    ? displayedCareerActionStateRef.current
    : rawCareerActionState;

  const submitGoalSummary = async (updates: GoalSummaryFields) => {
    const nextProfile = { ...displayedProfile, ...updates };
    const payload = {
      source: 'career_selection_goal_summary',
      onboardingAnswers,
      learnerProfile: nextProfile,
    };

    setError('learnerProfile', null);
    setError('careerMatches', null);
    setLoading('learnerProfile', true);
    setLoading('careerMatches', true);
    setConstructedPayload('learnerProfileRequest', payload);

    try {
      await generateProfile();
      if (learnerProfile) {
        updateLearnerProfile(updates);
      } else {
        setLearnerProfile(nextProfile);
      }
      if (usesStubData) {
        setCareerMatches(CAREER_SELECTION_STUB_MATCHES);
      }
      setExperienceStatus('profile_ready');
    } catch (error) {
      setError(
        'learnerProfile',
        errorMessage(error, 'Unable to update the learner profile.'),
      );
      throw error;
    } finally {
      setLoading('learnerProfile', false);
      setLoading('careerMatches', false);
    }
  };

  // buildPathway uses container-owned selectedCareer and visibleSkills. Used both for the
  // initial build (no existing pathway) and the rebuild confirmation (existing pathway with
  // relevant edits) — same workflow, gated differently in the UI.
  const buildPathway = useCallback(async () => {
    if (!selectedCareer || loading.pathwayCourses) {
      return;
    }
    const payload = {
      source: 'career_selection',
      learnerProfile: displayedProfile,
      selectedCareer,
      selectedCareerId: selectedCareer.id,
      skillsToDevelop: visibleSkills,
    };

    setSelectedCareerId(selectedCareer.id);
    setError('pathwayCourses', null);
    setLoading('pathwayCourses', true);
    setConstructedPayload('pathwayRequest', payload);
    setIsOverwriteOpen(false);

    try {
      await generatePathway();
      setExperienceStatus('pathway_ready');
      setPathwayBaseline({
        careerGoal: displayedProfile.careerGoal,
        targetIndustry: displayedProfile.targetIndustry,
        background: displayedProfile.background,
        motivation: displayedProfile.motivation,
        selectedCareerId: selectedCareer.id,
      });
      onNext?.();
    } catch (error) {
      setError(
        'pathwayCourses',
        errorMessage(error, 'Unable to build the learning pathway.'),
      );
    } finally {
      setLoading('pathwayCourses', false);
    }
  }, [
    selectedCareer,
    loading.pathwayCourses,
    displayedProfile,
    visibleSkills,
    setSelectedCareerId,
    setError,
    setLoading,
    setConstructedPayload,
    generatePathway,
    setExperienceStatus,
    setPathwayBaseline,
    onNext,
  ]);

  // Navigate to the existing pathway without building/rebuilding it.
  const viewExistingPathway = useCallback(() => {
    onNext?.();
  }, [onNext]);

  const openRetakeQuiz = useCallback(() => setIsRetakeOpen(true), []);
  const closeRetakeQuiz = useCallback(() => setIsRetakeOpen(false), []);
  const confirmRetakeQuiz = useCallback(() => {
    setIsRetakeOpen(false);
    onRetakeQuiz?.();
  }, [onRetakeQuiz]);

  const openRebuildModal = useCallback(() => setIsOverwriteOpen(true), []);
  const closeRebuildModal = useCallback(() => setIsOverwriteOpen(false), []);

  // Trailing action-bar buttons, state-dependent per the Career Profile action matrix.
  const trailingActions = useMemo((): PathwaysAction[] => {
    if (careerActionState === 'new-pathway') {
      return [{
        id: 'career-build-pathway',
        label: careerMessages.buildPathway,
        loadingLabel: careerMessages.buildingPathway,
        variant: 'primary',
        type: 'button',
        disabled: !selectedCareer || loading.pathwayCourses || loading.careerMatches,
        loading: loading.pathwayCourses,
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
        disabled: loading.pathwayCourses || loading.careerMatches,
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
        disabled: loading.pathwayCourses,
        onClick: viewExistingPathway,
        testId: 'career-view-current-pathway-button',
      },
      {
        id: 'career-rebuild-pathway',
        label: careerMessages.rebuildPathway,
        loadingLabel: careerMessages.buildingPathway,
        variant: 'primary',
        type: 'button',
        disabled: loading.pathwayCourses || loading.careerMatches,
        loading: loading.pathwayCourses,
        onClick: openRebuildModal,
        buttonRef: buildButtonRef,
        testId: 'career-rebuild-pathway-button',
      },
    ];
  }, [
    careerActionState,
    selectedCareer,
    loading.pathwayCourses,
    loading.careerMatches,
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
      profile={displayedProfile}
      careerMatches={displayedMatches}
      selectedCareerId={selectedCareerId}
      isProfileSubmitting={loading.learnerProfile || loading.careerMatches}
      isCareerMatchesLoading={
        loading.careerMatches && displayedMatches.length === 0
      }
      isBuildingPathway={loading.pathwayCourses}
      profileError={errors.learnerProfile}
      careerMatchesError={errors.careerMatches}
      onSubmitGoalSummary={submitGoalSummary}
      onSelectCareer={setSelectedCareerId}
      isOverwriteOpen={isOverwriteOpen}
      onCloseOverwrite={closeRebuildModal}
      onConfirmOverwrite={buildPathway}
      buildButtonRef={buildButtonRef}
      isRetakeOpen={isRetakeOpen}
      onCloseRetake={closeRetakeQuiz}
      onConfirmRetake={confirmRetakeQuiz}
      retakeButtonRef={retakeButtonRef}
      visibleSkills={visibleSkills}
      dismissedSkillCount={dismissedSkills.size}
      onDismissSkill={(skill) => setDismissedSkills(
        (current) => new Set([...current, skill]),
      )}
      onRestoreSkills={() => setDismissedSkills(new Set<string>())}
    />
  );
};

export default CareerSelectionContainer;
