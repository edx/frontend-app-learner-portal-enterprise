/**
 * Internal route configuration for the AI Pathways feature.
 *
 * This configuration is local to the feature slice and should not
 * be conflated with the main application's route configuration.
 */

export const ROUTES = {
  INTAKE: 'intake',
  PROFILE: 'profile',
  PATHWAY: 'pathway',
} as const;

export type RoutePath = typeof ROUTES[keyof typeof ROUTES];
