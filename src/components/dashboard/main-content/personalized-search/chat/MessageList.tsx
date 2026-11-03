import { useIntl } from '@edx/frontend-platform/i18n';

import messages from '../messages';
import type { AssistantTurn } from '../stream/types';
import AssistantMessage from './AssistantMessage';
import type { AssistantMessageProps } from './AssistantMessage';

export interface MessageListProps extends Pick<
AssistantMessageProps,
'busy' | 'onSend' | 'onViewPage' | 'onShowLastRecommendations' | 'onRetry'
> {
  turns: AssistantTurn[];
}

/** Latest turn before `index` that has a page. */
export const previousPageTurnId = (turns: AssistantTurn[], index: number): string | null => {
  for (let i = index - 1; i >= 0; i -= 1) {
    if (turns[i].blocks.length > 0) { return turns[i].localId; }
  }
  return null;
};

const MessageList = ({ turns, ...handlers }: MessageListProps) => {
  const intl = useIntl();
  return (
    <ol className="list-unstyled mb-0 personalized-search__messages">
      {turns.map((turn, index) => (
        <li key={turn.localId}>
          {turn.userMessage && (
            <div className="personalized-search__user bg-light-300 rounded px-3 py-2 mb-2 ml-4">
              <span className="sr-only">{intl.formatMessage(messages.you)}</span>
              <p className="mb-0">{turn.userMessage}</p>
            </div>
          )}
          <AssistantMessage
            turn={turn}
            isLatest={index === turns.length - 1}
            previousPageTurnId={previousPageTurnId(turns, index)}
            {...handlers}
          />
        </li>
      ))}
    </ol>
  );
};

export default MessageList;
