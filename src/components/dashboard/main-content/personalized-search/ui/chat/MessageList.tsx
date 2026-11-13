import { useIntl } from '@edx/frontend-platform/i18n';

import messages from '../messages';
import type { AssistantTurn } from '../../core/stream/types';
import { hasPage, selectPageTurn } from '../../core/selectors';
import AssistantMessage from './AssistantMessage';
import type { AssistantMessageProps } from './AssistantMessage';

export interface MessageListProps extends Pick<
AssistantMessageProps,
'busy' | 'onRetry' | 'onRate' | 'onViewResults' | 'getSignInUrl'
> {
  turns: AssistantTurn[];
  ratings?: Record<string, 1 | -1 | null>;
  /** The earlier reply whose results are on screen, or null for the newest results. */
  viewedTurnId?: string | null;
}

const MessageList = ({
  turns, ratings, viewedTurnId = null, ...handlers
}: MessageListProps) => {
  const intl = useIntl();
  // The newest reply with results is what the pane shows by default; earlier ones offer a way back.
  const latestPage = selectPageTurn(turns, null)?.localId ?? null;
  const shown = selectPageTurn(turns, viewedTurnId)?.localId ?? null;
  const resultsFor = (turn: AssistantTurn): 'view' | 'showing' | undefined => {
    if (turn.status !== 'done' || !hasPage(turn) || turn.localId === latestPage) { return undefined; }
    return turn.localId === shown ? 'showing' : 'view';
  };
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
            rating={ratings?.[turn.localId] ?? null}
            results={resultsFor(turn)}
            {...handlers}
          />
        </li>
      ))}
    </ol>
  );
};

export default MessageList;
