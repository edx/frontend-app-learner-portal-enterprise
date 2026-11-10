import { useIntl } from '@edx/frontend-platform/i18n';

import messages from '../messages';
import type { AssistantTurn } from '../../core/stream/types';
import AssistantMessage from './AssistantMessage';
import type { AssistantMessageProps } from './AssistantMessage';

export interface MessageListProps extends Pick<
AssistantMessageProps,
'busy' | 'onRetry'
> {
  turns: AssistantTurn[];
}

const MessageList = ({ turns, ...handlers }: MessageListProps) => {
  const intl = useIntl();
  return (
    <ol className="list-unstyled mb-0 personalized-search__messages">
      {turns.map((turn, index) => (
        <li key={turn.localId}>
          {turn.userMessage && (
            <div className="personalized-search__user bg-light-300 rounded px-3 py-2 mb-3 ml-auto">
              <span className="sr-only">{intl.formatMessage(messages.you)}</span>
              <p className="mb-0">{turn.userMessage}</p>
            </div>
          )}
          <AssistantMessage
            turn={turn}
            isLatest={index === turns.length - 1}
            {...handlers}
          />
        </li>
      ))}
    </ol>
  );
};

export default MessageList;
