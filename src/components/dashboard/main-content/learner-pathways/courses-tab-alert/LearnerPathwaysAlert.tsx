import { FormattedMessage } from '@edx/frontend-platform/i18n';
import { Alert, Button, Icon } from '@openedx/paragon';
import {
  ArrowForward, AutoAwesome, CheckCircle, School,
} from '@openedx/paragon/icons';
import classNames from 'classnames';

import messages from './messages';
import type { LearnerPathwaysAlertViewModel } from './types';
import './styles/index.scss';

export type LearnerPathwaysAlertProps = LearnerPathwaysAlertViewModel;

const PROGRESS_MESSAGE_BY_VARIANT = {
  in_progress: messages.progressInProgressTemplate,
  partial: messages.progressPartialTemplate,
  completed: messages.progressCompletedTemplate,
};

/**
 * Purely presentational — every value it renders is already resolved by
 * `useLearnerPathwaysAlertViewModel`. No store, query, or persistence primitive is
 * imported here.
 */
const LearnerPathwaysAlert = ({
  show,
  descriptor,
  careerGoal,
  progress,
  ctaDisabled,
  onCtaClick,
  onDismiss,
}: LearnerPathwaysAlertProps) => (
  <Alert
    variant="dark"
    show={show}
    dismissible
    onClose={onDismiss}
    data-testid="learner-pathways-alert"
    className={classNames('pathways-alert', `pathways-alert--${descriptor.family}`, 'mb-3')}
    actions={[
      <Button
        key="cta"
        variant="outline-primary"
        iconAfter={ArrowForward}
        onClick={onCtaClick}
        disabled={ctaDisabled}
        aria-disabled={ctaDisabled}
      >
        <FormattedMessage {...descriptor.ctaMessage} />
      </Button>,
    ]}
  >
    <div className="pathways-alert__eyebrow d-flex align-items-center mb-2">
      <span className="pathways-alert__eyebrow-badge">
        <Icon src={AutoAwesome} aria-hidden="true" />
      </span>
      <span className="pathways-alert__eyebrow-label text-uppercase small font-weight-bold ml-2">
        <FormattedMessage {...messages.eyebrowLabel} />
      </span>
    </div>
    <Alert.Heading className="h3">
      <FormattedMessage {...descriptor.headingMessage} />
    </Alert.Heading>
    <p className="mb-0">
      <FormattedMessage {...descriptor.bodyMessage} />
    </p>
    {progress && descriptor.progressVariant && (
      <p className="pathways-alert__progress d-flex align-items-center mt-2 mb-0">
        <Icon
          src={descriptor.progressVariant === 'completed' ? CheckCircle : School}
          aria-hidden="true"
          className="mr-1"
        />
        <FormattedMessage
          {...PROGRESS_MESSAGE_BY_VARIANT[descriptor.progressVariant]}
          values={{ careerGoal, ...progress }}
        />
      </p>
    )}
  </Alert>
);

export default LearnerPathwaysAlert;
