import { Alert, Button, Icon } from '@openedx/paragon';
import { AutoAwesome } from '@openedx/paragon/icons';
import { useIntl } from '@edx/frontend-platform/i18n';

import messages from '../messages';
import type { AssistantTurn } from '../../core/stream/types';
import StatusLine from './StatusLine';
import { presentTurnError } from './turnErrors';

export interface AssistantMessageProps {
  turn: AssistantTurn;
  /** Only the latest turn's chips are interactive. */
  isLatest: boolean;
  busy: boolean;
  onRetry: (turnId: string) => void;
}

const AssistantMessage = ({
  turn, isLatest, busy, onRetry,
}: AssistantMessageProps) => {
  const intl = useIntl();
  const isStreaming = turn.status === 'streaming';
  const isDone = turn.status === 'done';

  if (turn.status === 'error') {
    const { message, asAlert, canRetry } = presentTurnError(turn.error);
    const retry = canRetry && isLatest && (
      <Button variant="outline-primary" size="sm" disabled={busy} onClick={() => onRetry(turn.localId)}>
        {intl.formatMessage(messages.retry)}
      </Button>
    );
    return (
      <div className="personalized-search__assistant mb-3" data-turn-status={turn.status}>
        {asAlert ? (
          <Alert variant="danger" className="mb-0" actions={retry ? [retry] : []}>
            {intl.formatMessage(message)}
          </Alert>
        ) : (
          <p className="text-danger mb-0">{intl.formatMessage(message)}</p>
        )}
      </div>
    );
  }

  return (
    <div className="personalized-search__assistant d-flex mb-3" data-turn-status={turn.status}>
      <Icon src={AutoAwesome} size="sm" className="personalized-search__sparkle text-gray-500 mr-2 mt-1 flex-shrink-0" />
      <div className="flex-grow-1">
        <span className="sr-only">{intl.formatMessage(messages.assistant)}</span>
        {isStreaming && turn.step && <StatusLine step={turn.step} />}
        {turn.status === 'stopped' && (
          <p className="small text-gray-700 font-italic mb-1">{intl.formatMessage(messages.stopped)}</p>
        )}
        {/* Rendered as plain text: model output never becomes HTML. */}
        {turn.text && <p className="mb-1 personalized-search__reply">{turn.text}</p>}
        {isDone && turn.followups?.question && (
          <p className="mb-0 mt-1 personalized-search__followup-question">{turn.followups.question}</p>
        )}
      </div>
    </div>
  );
};

export default AssistantMessage;
