import { useLearnerPathwaysAlertViewModel } from './data/useLearnerPathwaysAlertViewModel';
import LearnerPathwaysAlert from './LearnerPathwaysAlert';

export interface LearnerPathwaysAlertContainerProps {
  onSelectTab: (tabName: string) => void;
  hasPathwaysTab?: boolean;
}

/**
 * Composition seam between the Courses tab and the stateful learner pathways alert:
 * resolves the current view model (canonical learner state + enrollment-derived
 * progress + dismissal) and hands it to the purely-presentational alert component.
 */
const LearnerPathwaysAlertContainer = ({
  onSelectTab,
  hasPathwaysTab = false,
}: LearnerPathwaysAlertContainerProps) => {
  const viewModel = useLearnerPathwaysAlertViewModel({ onSelectTab, hasPathwaysTab });
  return <LearnerPathwaysAlert {...viewModel} />;
};

export default LearnerPathwaysAlertContainer;
