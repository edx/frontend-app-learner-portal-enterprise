import { useIntl } from '@edx/frontend-platform/i18n';

import messages from '../messages';

const LearningPagePane = () => {
  const intl = useIntl();
  return (
    <section className="personalized-search__page" aria-label={intl.formatMessage(messages.pagePaneLabel)}>
      <p className="text-gray-700 mb-0">{intl.formatMessage(messages.emptyPage)}</p>
    </section>
  );
};

export default LearningPagePane;
