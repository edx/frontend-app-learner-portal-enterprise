import React from 'react';
import { FormattedMessage } from '@edx/frontend-platform/i18n';
import { Button } from '@openedx/paragon';

import messages from '../messages';

const InitialStateActionButton = ({ onStart }: { onStart?: () => void }) => (
  <div className="text-center">
    <Button
      variant="primary"
      data-testid="learner-pathways-action-start-onboarding"
      disabled={!onStart}
      onClick={(e: React.MouseEvent) => {
        e.preventDefault();
        onStart && onStart();
      }}
    >
      <FormattedMessage {...messages.startOnboarding} />
    </Button>
  </div>
);

export default InitialStateActionButton;
