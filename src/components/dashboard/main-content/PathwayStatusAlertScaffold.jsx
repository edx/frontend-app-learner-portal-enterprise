import PropTypes from 'prop-types';
import { Alert, Button } from '@openedx/paragon';
import { FormattedMessage } from '@edx/frontend-platform/i18n';

export const PATHWAY_STATUS_ALERT_STATES = {
  DEFAULT: 'default',
};

export const PATHWAY_STATUS_ALERT_CONTENT = {
  [PATHWAY_STATUS_ALERT_STATES.DEFAULT]: {
    headingMessage: {
      id: 'enterprise.dashboard.pathway.status.alert.scaffold.heading',
      defaultMessage: 'Pathway status update',
      description: 'Heading for v0 pathway status alert scaffold in courses tab.',
    },
    bodyMessage: {
      id: 'enterprise.dashboard.pathway.status.alert.scaffold.body',
      defaultMessage: 'Pathway status details will appear here once BFF-backed states are connected.',
      description: 'Body text for v0 pathway status alert scaffold in courses tab.',
    },
    actionMessage: {
      id: 'enterprise.dashboard.pathway.status.alert.scaffold.button',
      defaultMessage: 'Open Pathways tab',
      description: 'Button text for v0 pathway status alert scaffold in courses tab.',
    },
    actionType: 'openPathwaysTab',
  },
};

const getActionHandler = (actionType, onOpenPathwaysTab) => {
  const actionHandlers = {
    openPathwaysTab: onOpenPathwaysTab,
  };
  return actionHandlers[actionType] || onOpenPathwaysTab;
};

const PathwayStatusAlertScaffold = ({
  className,
  onOpenPathwaysTab,
  pathwayStatusAlertState,
}) => {
  const pathwayStatusAlertContent = PATHWAY_STATUS_ALERT_CONTENT[pathwayStatusAlertState]
    || PATHWAY_STATUS_ALERT_CONTENT[PATHWAY_STATUS_ALERT_STATES.DEFAULT];
  const onActionClick = getActionHandler(pathwayStatusAlertContent.actionType, onOpenPathwaysTab);

  return (
    <Alert
      className={className}
      data-testid="pathway-status-alert-scaffold"
      variant="info"
    >
      <div className="d-flex flex-column">
        <div>
          <p className="mb-2">
            <strong>
              <FormattedMessage {...pathwayStatusAlertContent.headingMessage} />
            </strong>
          </p>
          <p className="mb-0">
            <FormattedMessage {...pathwayStatusAlertContent.bodyMessage} />
          </p>
        </div>
        <div className="d-flex justify-content-end mt-3">
          <Button onClick={onActionClick} variant="primary">
            <FormattedMessage {...pathwayStatusAlertContent.actionMessage} />
          </Button>
        </div>
      </div>
    </Alert>
  );
};

PathwayStatusAlertScaffold.defaultProps = {
  className: undefined,
  pathwayStatusAlertState: PATHWAY_STATUS_ALERT_STATES.DEFAULT,
};

PathwayStatusAlertScaffold.propTypes = {
  className: PropTypes.string,
  onOpenPathwaysTab: PropTypes.func.isRequired,
  pathwayStatusAlertState: PropTypes.oneOf(Object.values(PATHWAY_STATUS_ALERT_STATES)),
};

export default PathwayStatusAlertScaffold;
