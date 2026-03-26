/**
 * Feature-local constants for the AI Pathways prototype.
 */

export const FEATURE_NAME = 'AI Pathways';

export const LEARNING_STYLE_OPTIONS = [
  { value: 'async', label: 'Async only', description: 'Learn at your own pace with recorded content' },
  { value: 'async_live', label: 'Async + live sessions', description: 'Mix of self-paced and real-time interaction' },
] as const;

export const TIME_AVAILABILITY_OPTIONS = [
  'Up to 3 hours per week',
  '4-6 hours per week',
  '7 or more hours per week',
] as const;

export const CERTIFICATE_PREFERENCE_OPTIONS = [
  'Yes, definitely',
  'Maybe, depending on the program',
  'No, just here for personal growth',
] as const;
