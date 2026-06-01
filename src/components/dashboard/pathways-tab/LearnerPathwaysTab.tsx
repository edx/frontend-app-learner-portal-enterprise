import { LearnerPathwaysTabInitialState } from './initial-state';

/**
 * Dashboard Pathways-tab entry scaffold for Learner Pathways.
 * Currently renders the neutral initial-state container while subsequent states
 * (onboarding/profile/pathway detail) are iterated.
 */
const LearnerPathwaysTab = () => (
  <div data-testid="learner-pathways-tab-scaffold" className="mt-4">
    <LearnerPathwaysTabInitialState />
  </div>
);

export default LearnerPathwaysTab;
