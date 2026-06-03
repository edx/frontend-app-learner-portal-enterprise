import { FormattedMessage } from '@edx/frontend-platform/i18n';
import { Alert, Button } from '@openedx/paragon';

import {
  DEFAULT_LEARNER_PATHWAYS_ALERT_STATE,
} from './data/constants';
import {
  resolveLearnerPathwaysAlertDescriptor,
} from './data/utils';
import {
  LearnerPathwaysAlertStateKey,
  LearnerPathwaysProgressCounts,
} from './types';
import learnerPathwaysMessages from './messages';
import { DASHBOARD_PATHWAYS_TAB } from '../../../data';

/**
 * Props for {@link LearnerPathwaysAlert}.
 */
type LearnerPathwaysAlertProps = {
  /**
   * Callback used to activate a dashboard tab when a CTA is pressed.
   */
  onSelectTab: (tabName: string) => void;
  /**
   * Whether the classic Pathways tab is available.
   */
  hasPathwaysTab: boolean;
  /**
   * Visual state of the learner pathways scaffold card.
   */
  initialState?: LearnerPathwaysAlertStateKey;
  /**
   * Dynamic counters used by progress-oriented messages.
   */
  progressCounts?: LearnerPathwaysProgressCounts;
};

/**
 * Renders the learner pathways alert scaffold shown on the dashboard courses tab.
 *
 * The component is intentionally state-driven and translation-key-based so it can
 * evolve from scaffold data to live backend state while preserving its UI contract.
 */
const LearnerPathwaysAlert = ({
  onSelectTab,
  hasPathwaysTab,
  initialState = DEFAULT_LEARNER_PATHWAYS_ALERT_STATE,
  progressCounts = {
    startedCount: 0,
    completedCount: 0,
    totalCount: 5,
  },
}: LearnerPathwaysAlertProps) => {
  /**
   * Resolve the state-specific descriptor used to render heading/body/actions.
   */
  const alertDescriptor = resolveLearnerPathwaysAlertDescriptor(initialState);

  const targetTab = hasPathwaysTab ? DASHBOARD_PATHWAYS_TAB : null;
  const areActionsDisabled = !targetTab;

  /**
   * Shared interpolation values for messages that include progress counters.
   */
  const alertMessageValues = {
    startedCount: progressCounts.startedCount,
    completedCount: progressCounts.completedCount,
    totalCount: progressCounts.totalCount,
  };

  /**
   * Build CTA buttons from descriptor metadata.
   */
  const actions = alertDescriptor.actions.map((action) => (
    <Button
      key={action.id}
      variant={action.variant || 'primary'}
      onClick={() => {
        if (targetTab) {
          onSelectTab(targetTab);
        }
      }}
      disabled={areActionsDisabled}
      aria-disabled={areActionsDisabled}
    >
      <FormattedMessage {...learnerPathwaysMessages[action.labelKey]} />
    </Button>
  ));

  return (
    <Alert
      variant="info"
      show
      data-testid="learner-pathways-alert"
      actions={actions}
      className="mb-3"
    >
      <Alert.Heading>
        <FormattedMessage
          {...learnerPathwaysMessages[alertDescriptor.headingKey]}
          values={alertMessageValues}
        />
      </Alert.Heading>
      <p className="mb-0">
        <FormattedMessage
          {...learnerPathwaysMessages[alertDescriptor.bodyKey]}
          values={alertMessageValues}
        />
      </p>
    </Alert>
  );
};

export default LearnerPathwaysAlert;
