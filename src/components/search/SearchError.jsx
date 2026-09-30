import PropTypes from 'prop-types';
import { Alert } from '@openedx/paragon';
import { Warning } from '@openedx/paragon/icons';
import { useIntl } from '@edx/frontend-platform/i18n';
import { getSearchErrorMessage } from '../utils/search';

const SearchError = ({ title }) => {
  const intl = useIntl();
  const { messageTitle, messageContent, values } = getSearchErrorMessage(title);

  return (
    <Alert
      variant="danger"
      dismissible={false}
      icon={Warning}
      open
    >
      <Alert.Heading>
        {intl.formatMessage(messageTitle, values)}
      </Alert.Heading>
      {intl.formatMessage(messageContent, values)}
    </Alert>
  );
};

SearchError.propTypes = {
  title: PropTypes.string.isRequired,
};

export default SearchError;
