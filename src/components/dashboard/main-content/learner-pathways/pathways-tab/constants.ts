export const VIEWS = {
  ONBOARDING: 'onboarding',
  PROFILE: 'profile',
  PATHWAY: 'pathway',
} as const;

export type View = typeof VIEWS[keyof typeof VIEWS];
