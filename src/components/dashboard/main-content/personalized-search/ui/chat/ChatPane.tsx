import { Chip, Stack } from '@openedx/paragon';
import { useIntl } from '@edx/frontend-platform/i18n';

import messages from '../messages';

export interface ChatPaneProps {
  openingChips: string[];
}

const ChatPane = ({ openingChips }: ChatPaneProps) => {
  const intl = useIntl();
  return (
    <section className="personalized-search__chat" aria-label={intl.formatMessage(messages.chatPaneLabel)}>
      <div className="personalized-search__greeting mb-3">
        <p className="h4 mb-1">{intl.formatMessage(messages.greeting)}</p>
        <p className="mb-0 text-gray-700">{intl.formatMessage(messages.greetingDetail)}</p>
      </div>
      <Stack direction="horizontal" gap={2} className="flex-wrap">
        {openingChips.map((chip) => <Chip key={chip}>{chip}</Chip>)}
      </Stack>
    </section>
  );
};

export default ChatPane;
