import { Button } from '@openedx/paragon';
import { useIntl } from '@edx/frontend-platform/i18n';

import messages from '../messages';
import type { AssistantTurn } from '../../core/stream/types';
import FollowUpChips from './FollowUpChips';
import StatusLine from './StatusLine';

export interface AssistantMessageProps {
  turn: AssistantTurn;
  /** Only the latest turn's chips are interactive. */
  isLatest: boolean;
  busy: boolean;
  /** For a text-only turn: the earlier turn whose page "See your last recommendations" shows. */
  previousPageTurnId: string | null;
  onSend: (message: string) => void;
  onViewPage: (turnId: string) => void;
  onShowLastRecommendations: (turnId: string) => void;
}

const AssistantMessage = ({
  turn, isLatest, busy, previousPageTurnId, onSend, onViewPage, onShowLastRecommendations,
}: AssistantMessageProps) => {
  const intl = useIntl();
  const isStreaming = turn.status === 'streaming';
  const isDone = turn.status === 'done';
  const hasPage = turn.blocks.length > 0;

  return (
    <div className="personalized-search__assistant mb-3" data-turn-status={turn.status}>
      <span className="sr-only">{intl.formatMessage(messages.assistant)}</span>
      {isStreaming && turn.step && <StatusLine step={turn.step} />}
      {/* Rendered as plain text: model output never becomes HTML. */}
      {turn.text && <p className="mb-1 personalized-search__reply">{turn.text}</p>}
      {isDone && hasPage && (
        <Button variant="link" size="inline" className="p-0" onClick={() => onViewPage(turn.localId)}>
          {intl.formatMessage(messages.viewPage)}
        </Button>
      )}
      {isDone && !hasPage && previousPageTurnId && (
        <Button
          variant="link"
          size="inline"
          className="p-0"
          onClick={() => onShowLastRecommendations(previousPageTurnId)}
        >
          {intl.formatMessage(messages.seeLastRecommendations)}
        </Button>
      )}
      {isDone && isLatest && turn.followups && (
        <FollowUpChips
          question={turn.followups.question}
          suggestions={turn.followups.suggestions}
          disabled={busy}
          onSelect={onSend}
        />
      )}
    </div>
  );
};

export default AssistantMessage;
