import { ReactNode } from 'react';
import { FormattedMessage } from '@edx/frontend-platform/i18n';

import messages from '../messages';

/**
 * Lightweight neutral placeholder lines shown beneath each initial-state step.
 */
const PlaceholderLines = () => (
  <div aria-hidden="true">
    <div className="rounded mb-2" style={{ height: '6px', backgroundColor: 'rgba(108, 117, 125, 0.3)', width: '90%' }} />
    <div className="rounded mb-2" style={{ height: '6px', backgroundColor: 'rgba(108, 117, 125, 0.3)', width: '84%' }} />
    <div className="rounded" style={{ height: '6px', backgroundColor: 'rgba(108, 117, 125, 0.3)', width: '90%' }} />
  </div>
);

/**
 * Shared step section used by the initial-state body.
 */
const InitialStateStep = ({
  testId,
  content,
  className,
}: {
  testId: string;
  content: ReactNode;
  className?: string;
}) => (
  <div data-testid={testId} className={className}>
    <h3 className="h2 mb-3 text-dark">{content}</h3>
    <PlaceholderLines />
  </div>
);

/**
 * Main three-column body content for the Learner Pathways tab initial state.
 */
const InitialStateBody = () => (
  <div className="d-flex flex-column flex-lg-row justify-content-between">
    <InitialStateStep
      testId="learner-pathways-entry-section"
      className="mb-4 mb-lg-0 flex-fill mr-lg-4"
      content={<FormattedMessage {...messages.stageOnboarding} />}
    />
    <InitialStateStep
      testId="learner-pathways-profile-section"
      className="mb-4 mb-lg-0 flex-fill mr-lg-4"
      content={<FormattedMessage {...messages.stageProfile} />}
    />
    <InitialStateStep
      testId="learner-pathways-pathway-section"
      className="flex-fill"
      content={<FormattedMessage {...messages.stagePathway} />}
    />
  </div>
);

export default InitialStateBody;
