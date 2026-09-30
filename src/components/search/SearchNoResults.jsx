import PropTypes from 'prop-types';
import { Alert } from '@openedx/paragon';
import { useIntl } from '@edx/frontend-platform/i18n';
import { ZoomOut } from '@openedx/paragon/icons';

import { PopularResults } from './popular-results';
import { getNoResultsMessage } from '../utils/search';

const SearchNoResults = ({ title, indexName }) => {
  const intl = useIntl();
  const { messageTitle, messageContent, values } = getNoResultsMessage(title);

  return (
    <>
      <Alert
        className="mb-5"
        variant="info"
        dismissible={false}
        icon={ZoomOut}
        show
      >
        <Alert.Heading>{intl.formatMessage(messageTitle, values)}</Alert.Heading>
        {intl.formatMessage(messageContent, values)}
      </Alert>
      <PopularResults title={title} indexName={indexName} />
    </>
  );
};

SearchNoResults.propTypes = {
  title: PropTypes.string.isRequired,
  indexName: PropTypes.string,
};

SearchNoResults.defaultProps = {
  indexName: undefined,
};

export default SearchNoResults;
