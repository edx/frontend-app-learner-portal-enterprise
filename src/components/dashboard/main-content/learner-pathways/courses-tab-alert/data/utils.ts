import { LEARNER_PATHWAYS_ALERT_DESCRIPTORS } from './constants';
import {
  LearnerPathwaysAlertDescriptor,
  LearnerPathwaysAlertStateKey,
} from '../types';

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
