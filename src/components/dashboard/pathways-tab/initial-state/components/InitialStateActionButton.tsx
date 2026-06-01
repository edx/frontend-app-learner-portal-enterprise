import { FormattedMessage } from '@edx/frontend-platform/i18n';
import { Button } from '@openedx/paragon';

import messages from '../messages';

/**
 * Primary initial-state CTA.
 * The button is stepped out as its own abstraction while onboarding behavior
 * remains intentionally unbound in this scaffold phase.
 */
const InitialStateActionButton = () => (
  <div className="text-center">
    <Button
      variant="secondary"
      data-testid="learner-pathways-action-start-onboarding"
      disabled
    >
      <FormattedMessage {...messages.startOnboarding} />
    </Button>
  </div>
);

export default InitialStateActionButton;
