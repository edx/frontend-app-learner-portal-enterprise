/**
 * Canonical learner-intent contract. Framework-free by design: this shape is shared,
 * unchanged, by the Intake/Goal Summary RHF forms, the Zustand store, localStorage
 * persistence, and the profile-generation workflow/service request — no field is ever
 * renamed between those layers (e.g. no `goal`/`careerGoal` or `industry`/`targetIndustry`
 * split). The one place external wire names differ (the backend's fixed Learning Intent
 * contract) owns a single private serializer instead of a second shared type — see
 * `src/components/app/data/services/xpert.ts`.
 */
export interface LearnerIntent {
  careerGoal: string;
  targetIndustry: string;
  background: string;
  motivation: string;
}

export const EMPTY_LEARNER_INTENT: LearnerIntent = {
  careerGoal: '',
  targetIndustry: '',
  background: '',
  motivation: '',
};
