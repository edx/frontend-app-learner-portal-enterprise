import { CreateLearnerProfileArgs } from '../types';

/**
 * Represents the cleaned and structured user data ready for the AI Intent Extraction stage.
 */
export interface PreprocessedInput {
  /** Cleaned primary narrative from the user (e.g., "What brings you here"). */
  freeText: string;
  /** Extracted objectives from "Career Goal" and "Industry" fields. */
  selectedGoals?: string[];
  /** Experience context from "Background" and "Skills" fields. */
  knownContext?: string[];
  /** Modality and commitment preferences (e.g., "async", "long-term"). */
  preferences?: string[];
}

/**
 * Utility for normalizing raw intake form responses.
 *
 * Pipeline context: This is the very first stage of the generation process. It
 * transforms raw UI strings into a compact, noise-free structure that reduces
 * token usage and improves intent extraction accuracy in later AI stages.
 */
export const intakePreprocessor = {
  /**
   * Preprocesses raw intake form arguments into a structured format for the AI.
   *
   * @param args The raw intake form responses captured from the UI.
   * @returns A structured PreprocessedInput object.
   */
  preprocessInput(args: CreateLearnerProfileArgs): PreprocessedInput {
    /**
     * Removes common conversational fillers and trims whitespace to isolate the core intent.
     */
    const cleanText = (text: string) => (
      text || ''
    )
      .trim()
      .replace(/^I want to learn |Please show me |Could you help me with /gi, '');

    /**
     * Maps human-readable time availability options to normalized internal keys.
     * These keys ('short', 'medium', 'long') match the expected schema for the AI.
     */
    const mapTime = (time: string) => {
      const t = (time || '').toLowerCase();
      if (t.includes('up to 3') || t.includes('short')) { return 'short'; }
      if (t.includes('4-6') || t.includes('medium')) { return 'medium'; }
      if (t.includes('7 or more') || t.includes('long')) { return 'long'; }
      return t;
    };

    return {
      freeText: cleanText(args.bringsYouHereRes),
      selectedGoals: [args.careerGoalRes, args.industryRes].filter(Boolean),
      knownContext: [args.backgroundRes].filter(Boolean),
      preferences: [
        args.learningPrefRes,
        mapTime(args.timeAvailableRes),
        args.certificateRes,
      ].filter(Boolean),
    };
  },
};
