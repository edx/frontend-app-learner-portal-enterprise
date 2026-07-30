import type { MessageDescriptor } from '@edx/frontend-platform/i18n';

// Imported for type use only (descriptor/view-model shapes below) — deliberately not
// re-exported from this module's `export *` to avoid an ambiguous duplicate export
// through `learner-pathways/index.ts`, which already re-exports `pathways-tab`'s state.
import type { PathwaysExperienceStatus, PathwaysSection } from '../pathways-tab/state/types';

/** Which of the three gradient treatments a status's alert should use. */
export type LearnerPathwaysAlertGradientFamily = 'purple' | 'blue' | 'green';

/** Which progress-line copy template applies, given the resolved progress counts. */
export type LearnerPathwaysProgressVariant = 'ready' | 'in_progress' | 'partial' | 'completed';

/**
 * Static, per-status display descriptor. Keyed by the full `PathwaysExperienceStatus`
 * union (see `data/constants.ts`) so the compiler forces an update here if that union
 * ever grows — mirrors the `STATUS_MESSAGE`/`STATUS_BADGE_VARIANT` pattern already used
 * in `pathway-courses/constants.ts`.
 */
export interface LearnerPathwaysAlertDescriptor {
  family: LearnerPathwaysAlertGradientFamily;
  headingMessage: MessageDescriptor;
  bodyMessage: MessageDescriptor;
  ctaMessage: MessageDescriptor;
  targetSection: PathwaysSection;
  /** `null` for states with no generated pathway yet — the progress line doesn't render. */
  progressVariant: LearnerPathwaysProgressVariant | null;
}

/** Resolved progress counts, sourced verbatim from `resolvePathwayCourses(...).progress`. */
export interface LearnerPathwaysAlertProgress {
  completed: number;
  inProgress: number;
  totalCourses: number;
}

/**
 * Fully-resolved props for the presentational `LearnerPathwaysAlert` — no store, query, or
 * persistence primitives leak past this shape; the component only renders it.
 */
export interface LearnerPathwaysAlertViewModel {
  status: PathwaysExperienceStatus;
  show: boolean;
  descriptor: LearnerPathwaysAlertDescriptor;
  careerGoal: string;
  /** `null` unless `descriptor.progressVariant` is set. */
  progress: LearnerPathwaysAlertProgress | null;
  ctaDisabled: boolean;
  onCtaClick: () => void;
  onDismiss: () => void;
}
