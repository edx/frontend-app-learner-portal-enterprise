import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { Alert, Button } from '@openedx/paragon';
import { FormattedMessage, useIntl } from '@edx/frontend-platform/i18n';

const NewGroupAssignmentAlert = ({
  showAlert,
  enterpriseCustomer,
  onClose,
}) => {
  const intl = useIntl();
  return (
    <Alert
      variant="info"
      show={showAlert}
      dismissible
      actions={[
        <Button
          as={Link}
          className="text-nowrap"
          to="search"
        >
          <FormattedMessage
            id="enterprise.dashboard.group.assignment.alert.find.course.button"
            defaultMessage="Find a course"
            description="Find a course button label for the new group assignment alert"
          />
        </Button>,
      ]}
      onClose={onClose}
      closeLabel={intl.formatMessage({
        id: 'enterprise.dashboard.group.assignment.alert.dismiss.button',
        defaultMessage: 'Dismiss',
        description: 'Dismiss button label for the group assignment alert',
      })}
    >
      <Alert.Heading>
        <FormattedMessage
          id="enterprise.dashboard.group.assignment.alert.heading"
          defaultMessage="You have new courses to browse"
          description="Heading of the alert telling the learner that new courses are available to them"
        />
      </Alert.Heading>
      <p>
        <FormattedMessage
          id="enterprise.dashboard.group.assignment.alert.body"
          defaultMessage="You can now browse new courses and enroll using the Learner Credit provided by {enterpriseName}."
          description="Body of the alert telling the learner that new courses are available. {enterpriseName} is the name of their organization."
          values={{ enterpriseName: enterpriseCustomer.name }}
        />
      </p>
    </Alert>
  );
};

NewGroupAssignmentAlert.propTypes = {
  onClose: PropTypes.func,
  showAlert: PropTypes.bool,
  enterpriseCustomer: PropTypes.shape({
    name: PropTypes.string,
  }),
};

NewGroupAssignmentAlert.defaultProps = {
  onClose: null,
  showAlert: false,
  enterpriseCustomer: null,
};

export default NewGroupAssignmentAlert;
