import {
  DASHBOARD_AI_PATHWAYS_TAB,
  DASHBOARD_PATHWAYS_TAB,
} from '../../../data/constants';
import { LEARNER_PATHWAYS_ALERT_DESCRIPTORS } from './constants';
import {
  LearnerPathwaysAlertDescriptor,
  LearnerPathwaysAlertStateKey,
  LearnerPathwaysTabTarget,
} from '../types';

type ResolveTabTargetOptions = {
  hasAIPathwaysTab: boolean;
  hasPathwaysTab: boolean;
};

/**
 * Resolves the display descriptor for the provided alert state key.
 *
 * @param state - Current learner pathways alert state.
 * @returns Descriptor containing i18n keys and CTA metadata for rendering.
 */
export function resolveLearnerPathwaysAlertDescriptor(
  state: LearnerPathwaysAlertStateKey,
): LearnerPathwaysAlertDescriptor {
  return LEARNER_PATHWAYS_ALERT_DESCRIPTORS[state];
}

/**
 * Determines which dashboard tab the learner pathways CTA should open.
 *
 * Priority:
 * 1. AI Pathways tab (when enabled)
 * 2. Pathways tab
 * 3. No target (disabled actions)
 *
 * @param options - Available tab flags for the current dashboard context.
 * @returns Preferred {@link LearnerPathwaysTabTarget} or `null`.
 */
export function resolveLearnerPathwaysTabTarget({
  hasAIPathwaysTab,
  hasPathwaysTab,
}: ResolveTabTargetOptions): LearnerPathwaysTabTarget {
  if (hasAIPathwaysTab) {
    return DASHBOARD_AI_PATHWAYS_TAB;
  }
  if (hasPathwaysTab) {
    return DASHBOARD_PATHWAYS_TAB;
  }
  return null;
}
