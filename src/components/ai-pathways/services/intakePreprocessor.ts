import { CreateLearnerProfileArgs } from '../types';

/**
 * Preprocessed user data ready for LLM extraction.
 */
export interface PreprocessedInput {
  freeText: string; // Cleaned primary user input
  selectedGoals?: string[]; // Extracted from "Career Goal" and "Industry" fields
  knownContext?: string[]; // Extracted from "Background" and "Skills" fields
  preferences?: string[]; // Map of technical/style preferences (e.g., "practical", "certificate")
}

/**
 * Utility for preprocessing raw intake form arguments into a compact structure for the LLM.
 */
export const intakePreprocessor = {
  /**
   * Preprocesses raw intake form arguments into a compact structure for the LLM.
   *
   * @param args The raw intake form responses.
   * @returns Preprocessed input.
   */
  preprocessInput(args: CreateLearnerProfileArgs): PreprocessedInput {
    // 1. Clean noise and conversational fillers
    const cleanText = (text: string) => (text || '').trim().replace(/^I want to learn |Please show me |Could you help me with /gi, '');

    // 2. Map fixed-choice UI strings to concise keywords (Local Normalization)
    const mapTime = (time: string) => {
      const t = (time || '').toLowerCase();
      if (t.includes('0-2') || t.includes('short')) { return 'short'; }
      if (t.includes('2-5') || t.includes('medium')) { return 'medium'; }
      if (t.includes('5+') || t.includes('long')) { return 'long'; }
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
