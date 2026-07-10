import React, {
  useCallback, useEffect, useMemo, useRef, useState,
} from 'react';
import type { SearchIndex } from 'algoliasearch/lite';
import { useShallow } from 'zustand/react/shallow';

import CareerSelectionPage from './career-selection/CareerSelectionPage';
import type { GoalSummaryFields } from './career-selection/GoalSummaryCard';
import {
  CAREER_SELECTION_STUB_MATCHES,
  buildCareerSelectionStubProfile,
} from './career-selection/fixtures';
import careerMessages from './career-selection/messages';
import { usePathwaysController } from './hooks';
import { usePathwaysCourses, usePathwaysStore } from './state';
import { usePathwaysActionBar } from './action-bar';

export interface CareerSelectionContainerProps {
  /** Obtained by LearnerPathwaysTab via useAlgoliaSearch and passed down. */
  jobIndex: SearchIndex | null;
  catalogIndex: SearchIndex | null;
}

const errorMessage = (
  error: unknown,
  fallback: string,
) => (error instanceof Error && error.message ? error.message : fallback);

/** UI adapter to the learner-pathways store/controller/workflow seams. */
const CareerSelectionContainer = ({
  jobIndex,
  catalogIndex,
}: CareerSelectionContainerProps) => {
  const {
    onboardingAnswers,
    learnerProfile,
    careerMatches,
    selectedCareerId,
    learningIntent,
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
      learningIntent: state.learningIntent,
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

  const { generateProfile, generatePathway } = usePathwaysController({ jobIndex, catalogIndex });
  const { registerActions, clearActions } = usePathwaysActionBar();

  // Ref shared between the portaled action bar button and OverwritePathwayModal.
  const buildButtonRef = useRef<HTMLButtonElement>(null);

  // Modal + skills state lifted from CareerSelectionPage.
  const [isOverwriteOpen, setIsOverwriteOpen] = useState(false);
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

  // Integration seam: profile edits (careerGoal, targetIndustry, background,
  // motivation) should route through generateProfileWorkflow — the same path as
  // intake — not call fetchLearningIntent directly. The workflow recomputes
  // intent-derived career matches; only commit displayedProfile/careerMatches
  // after that orchestration succeeds.
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
      // Integration spike (ENT-12007 verification, uncommitted): generateProfile now
      // requires explicit answers. Profile-edit -> Learning Intent reuse is still future
      // work (see the seam comment above); onboardingAnswers is passed here only to
      // satisfy the new required signature without changing this method's behavior.
      await generateProfile(onboardingAnswers);
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

  // buildPathway uses container-owned selectedCareer and visibleSkills. Build
  // Pathway calls controller.generatePathway with the actual taxonomy-derived
  // selected career (not a fixture, UI index, or stale free-text goal) — the
  // controller owns the Algolia course search -> Recommendation Feedback merge
  // -> state commit -> navigation sequence (see generatePathwayWorkflow.ts).
  const buildPathway = useCallback(async () => {
    if (!selectedCareer || loading.pathwayCourses) {
      return;
    }

    setSelectedCareerId(selectedCareer.id);
    setIsOverwriteOpen(false);

    try {
      await generatePathway({
        selectedCareer,
        learnerProfile: displayedProfile,
        learningIntent,
        visibleSkills,
      });
    } catch (error) {
      // Error already recorded in errors.pathwayCourses by the controller; stay
      // on the profile section so the learner can retry.
    }
  }, [
    selectedCareer,
    loading.pathwayCourses,
    displayedProfile,
    learningIntent,
    visibleSkills,
    setSelectedCareerId,
    generatePathway,
  ]);

  const handleBuildOrOverwrite = useCallback(() => {
    if (hasExistingPathway) {
      setIsOverwriteOpen(true);
    } else {
      buildPathway();
    }
  }, [hasExistingPathway, buildPathway]);

  // Register primary CTA in the page-level action bar.
  useEffect(() => {
    registerActions({
      primary: {
        id: 'career-build-pathway',
        label: careerMessages.buildPathway,
        loadingLabel: careerMessages.buildingPathway,
        variant: 'primary',
        type: 'button',
        disabled: !selectedCareer || loading.pathwayCourses || loading.careerMatches,
        loading: loading.pathwayCourses,
        onClick: handleBuildOrOverwrite,
        buttonRef: buildButtonRef,
        testId: 'profile-build-pathway-button',
      },
      alignment: 'end',
    });
    return () => clearActions();
  }, [
    selectedCareer,
    loading.pathwayCourses,
    loading.careerMatches,
    handleBuildOrOverwrite,
    registerActions,
    clearActions,
  ]);

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
      onCloseOverwrite={() => setIsOverwriteOpen(false)}
      onConfirmOverwrite={buildPathway}
      buildButtonRef={buildButtonRef}
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
