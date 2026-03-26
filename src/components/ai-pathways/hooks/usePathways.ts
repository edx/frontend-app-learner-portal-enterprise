import { useState, useCallback } from 'react';
import { pathwaysService } from '../services/pathways.service';
import type {
  LearningPathway,
  CareerOption,
  LearnerProfile,
  CreateLearnerProfileArgs,
} from '../services/pathways.types';

export type PathwayStep = 'intake' | 'profile' | 'pathway';

/**
 * Hook to manage AI Learning Pathways.
 *
 * This hook handles the state and logic for generating and retrieving
 * a personalized learning pathway based on a learner's profile and chosen career goal.
 */
export const usePathways = () => {
  const [currentStep, setCurrentStep] = useState<PathwayStep>('intake');
  const [learnerProfile, setLearnerProfile] = useState<LearnerProfile | null>(null);
  const [selectedCareer, setSelectedCareer] = useState<CareerOption | null>(null);
  const [pathway, setPathway] = useState<LearningPathway | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Generates a learner profile from intake form data.
   */
  const generateProfile = useCallback(async (args: CreateLearnerProfileArgs) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await pathwaysService.createLearnerProfile(args);
      setLearnerProfile(result);
      if (result.careerMatches.length > 0) {
        setSelectedCareer(result.careerMatches[0]);
      }
      setCurrentStep('profile');
      return result;
    } catch (err) {
      const errorInstance = err instanceof Error ? err : new Error('Failed to generate profile');
      setError(errorInstance);
      throw errorInstance;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Selects a career option from the match list.
   */
  const selectCareer = useCallback((career: CareerOption) => {
    setSelectedCareer(career);
  }, []);

  /**
   * Generates a new learning pathway using the AI service.
   */
  const generatePathway = useCallback(async () => {
    if (!selectedCareer || !learnerProfile) {
      throw new Error('Missing career or profile data to generate pathway');
    }

    setIsLoading(true);
    setError(null);
    try {
      const result = await pathwaysService.createLearningPathway(selectedCareer, learnerProfile);
      setPathway(result);
      setCurrentStep('pathway');
      return result;
    } catch (err) {
      const errorInstance = err instanceof Error ? err : new Error('Failed to generate pathway');
      setError(errorInstance);
      throw errorInstance;
    } finally {
      setIsLoading(false);
    }
  }, [selectedCareer, learnerProfile]);

  /**
   * Resets the entire flow state.
   */
  const reset = useCallback(() => {
    setCurrentStep('intake');
    setLearnerProfile(null);
    setSelectedCareer(null);
    setPathway(null);
    setError(null);
  }, []);

  return {
    currentStep,
    learnerProfile,
    selectedCareer,
    pathway,
    isLoading,
    error,
    generateProfile,
    selectCareer,
    generatePathway,
    reset,
    setCurrentStep,
  };
};
