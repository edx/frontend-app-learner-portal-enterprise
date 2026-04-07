import { useContext } from 'react';
import { RefinementContext } from '../components/InstantSearchWrapper';
import { SearchIntent } from '../types';

/**
 * Hook for UI components to interact with the refinement state.
 * Should be used inside children of InstantSearchWrapper.
 */
export const useAiPathwaysRefinement = () => {
  const context = useContext(RefinementContext);
  if (!context) {
    // In a real app, this might return a fallback or throw.
    // Throwing ensures it's used correctly within the provider.
    throw new Error('useAiPathwaysRefinement must be used within an InstantSearchWrapper');
  }

  const { intent, setIntent } = context;

  /**
   * Updates the semantic intent, triggering a re-computation of search filters.
   */
  const updateIntent = (updates: Partial<SearchIntent>) => {
    setIntent({
      ...intent,
      ...updates,
    });
  };

  /**
   * Resets the intent to its initial state.
   */
  const resetIntent = (initialIntent: SearchIntent) => {
    setIntent(initialIntent);
  };

  return {
    intent,
    updateIntent,
    resetIntent,
  };
};
