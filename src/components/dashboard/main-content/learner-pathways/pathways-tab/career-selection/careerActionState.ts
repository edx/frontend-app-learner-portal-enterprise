import { computePathwayInputFingerprint } from '../state';
import type { PathwayGenerationRequest } from '../state';

export type CareerActionState =
  | 'new-pathway'
  | 'existing-pathway-unchanged'
  | 'existing-pathway-edited';

/**
 * Whether the current pathway inputs differ from the request that produced the
 * pathway currently stored. A `null` fingerprint with an existing pathway is treated
 * as edited (conservative default) rather than assumed unchanged — this covers both
 * "no pathway generated yet" and any hydration path that can't trust its fingerprint.
 */
export const isPathwayEdited = (
  pathwayInputFingerprint: string | null,
  currentRequest: PathwayGenerationRequest,
): boolean => (
  pathwayInputFingerprint === null
    || pathwayInputFingerprint !== computePathwayInputFingerprint(currentRequest)
);

export interface GetCareerActionStateParams {
  hasExistingPathway: boolean;
  isEdited: boolean;
}

/**
 * Resolves which of the three Career Profile action-bar states applies.
 * `isEdited` is only consulted once `hasExistingPathway` is true — with no
 * existing pathway there's nothing to compare against yet, so any prior
 * edit state is irrelevant and checked in that order.
 * @param params.hasExistingPathway - whether pathwayCourses is non-empty
 * @param params.isEdited - from `isPathwayEdited`; ignored when hasExistingPathway is false
 */
export const getCareerActionState = ({
  hasExistingPathway,
  isEdited,
}: GetCareerActionStateParams): CareerActionState => {
  if (!hasExistingPathway) {
    return 'new-pathway';
  }
  return isEdited ? 'existing-pathway-edited' : 'existing-pathway-unchanged';
};
