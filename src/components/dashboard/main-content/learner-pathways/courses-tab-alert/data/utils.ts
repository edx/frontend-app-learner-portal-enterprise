import { LEARNER_PATHWAYS_ALERT_DESCRIPTORS } from './constants';
import type { PathwaysExperienceStatus } from '../../pathways-tab/state/types';
import type { LearnerPathwaysAlertDescriptor } from '../types';

/**
 * Resolves the display descriptor for the provided experience status.
 *
 * @param status - Current learner pathways experience status.
 * @returns Descriptor containing message descriptors and CTA metadata for rendering.
 */
export function resolveLearnerPathwaysAlertDescriptor(
  status: PathwaysExperienceStatus,
): LearnerPathwaysAlertDescriptor {
  return LEARNER_PATHWAYS_ALERT_DESCRIPTORS[status];
}
