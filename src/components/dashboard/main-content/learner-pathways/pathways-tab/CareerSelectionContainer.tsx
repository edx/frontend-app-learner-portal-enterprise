import React, { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';

import CareerSelectionPage from './career-selection/CareerSelectionPage';
import type { GoalSummaryFields } from './career-selection/GoalSummaryCard';
import {
  CAREER_SELECTION_STUB_MATCHES,
  buildCareerSelectionStubProfile,
} from './career-selection/fixtures';
import { usePathwaysController } from './hooks';
import { usePathwaysCourses, usePathwaysStore } from './state';
import type { CareerMatch } from './state';

export interface CareerSelectionContainerProps {
  onNext?: () => void;
}

const errorMessage = (
  error: unknown,
  fallback: string,
) => (error instanceof Error && error.message ? error.message : fallback);

/** UI adapter to the learner-pathways store/controller/workflow seams. */
const CareerSelectionContainer = ({
  onNext,
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

  // Narrow selector: only subscribes to course count changes, not full course array.
  const pathwayCourses = usePathwaysCourses();
  const hasExistingPathway = pathwayCourses.length > 0;

  const { generateProfile, generatePathway } = usePathwaysController();

  const stubProfile = useMemo(
    () => buildCareerSelectionStubProfile(onboardingAnswers),
    [onboardingAnswers],
  );
  const displayedProfile = learnerProfile ?? stubProfile;
  const usesStubData = learnerProfile === null && careerMatches.length === 0;
  const displayedMatches = usesStubData
    ? CAREER_SELECTION_STUB_MATCHES
    : careerMatches;

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
      // Controller reads the staged payload from constructedPayloads.learnerProfileRequest.
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

  const buildPathway = async (
    career: CareerMatch,
    skillsToDevelop: string[],
  ) => {
    const payload = {
      source: 'career_selection',
      learnerProfile: displayedProfile,
      selectedCareer: career,
      selectedCareerId: career.id,
      skillsToDevelop,
    };

    setSelectedCareerId(career.id);
    setError('pathwayCourses', null);
    setLoading('pathwayCourses', true);
    setConstructedPayload('pathwayRequest', payload);

    try {
      // Controller reads the staged payload from constructedPayloads.pathwayRequest.
      await generatePathway();
      setExperienceStatus('pathway_ready');
      onNext?.();
    } catch (error) {
      setError(
        'pathwayCourses',
        errorMessage(error, 'Unable to build the learning pathway.'),
      );
    } finally {
      setLoading('pathwayCourses', false);
    }
  };

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
      hasExistingPathway={hasExistingPathway}
      onSubmitGoalSummary={submitGoalSummary}
      onSelectCareer={setSelectedCareerId}
      onBuildPathway={buildPathway}
    />
  );
};

export default CareerSelectionContainer;
