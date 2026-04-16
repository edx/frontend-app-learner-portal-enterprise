/**
 * UI-related constants for the AI Pathways feature.
 *
 * Used in: IntakeForm, useIntakeForm, and other UI components.
 * Extend when adding new form options or UI steps.
 */

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

export const FEATURE_STEPS = {
  INTAKE: 'intake',
  PROFILE: 'profile',
  PATHWAY: 'pathway',
} as const;

export const INTAKE_STEPS = {
  GOALS: 0,
  BACKGROUND: 1,
  PREFERENCES: 2,
  PROCESSING: 3,
} as const;

export const COURSE_STATUSES = {
  COMPLETED: 'completed',
  IN_PROGRESS: 'in_progress',
  NOT_STARTED: 'not_started',
} as const;

export interface IntakePageInfo {
  title: string;
  subtitle: string;
}

export const INTAKE_PAGES: IntakePageInfo[] = [
  {
    title: "Let's start with your goals",
    subtitle: 'A few thoughtful answers now mean a faster, clearer path ahead.',
  },
  {
    title: 'Tell us about your background',
    subtitle: 'This helps us understand your starting point.',
  },
  {
    title: 'How you like to learn',
    subtitle: "We'll use this to build a learning pathway tailored to you.",
  },
  {
    title: 'Building your learning profile',
    subtitle: 'Please wait, this can take a few moments.',
  },
];
