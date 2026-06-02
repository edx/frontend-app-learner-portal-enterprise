import { FormattedMessage } from '@edx/frontend-platform/i18n';

import messages from '../messages';

/**
 * Header content for the Learner Pathways tab initial state.
 */
const InitialStateHeader = () => (
  <>
    <h2 className="mb-0 text-dark">
      <FormattedMessage {...messages.heroTitle} />
    </h2>
    <p className="mb-0 col-lg-11 px-0">
      <FormattedMessage {...messages.heroBody} />
    </p>
  </>
);

export default InitialStateHeader;
