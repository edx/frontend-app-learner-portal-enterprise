import {
  Alert, Button, Icon, Stack,
} from '@openedx/paragon';
import {
  AutoAwesome, ThumbDown, ThumbDownOffAlt, ThumbUp, ThumbUpOffAlt,
} from '@openedx/paragon/icons';
import { useIntl } from '@edx/frontend-platform/i18n';

import messages from '../messages';
import type { AssistantTurn } from '../../core/stream/types';
import StatusLine from './StatusLine';
import { renderInlineBold } from './inlineBold';
import { presentTurnError } from './turnErrors';

export interface AssistantMessageProps {
  turn: AssistantTurn;
  /** Only the latest turn's chips are interactive. */
  isLatest: boolean;
  busy: boolean;
  onRetry: (turnId: string) => void;
  /** The learner's thumbs on this reply; omitted (with onRate) where rating isn't available. */
  rating?: 1 | -1 | null;
  onRate?: (turn: AssistantTurn, rating: 1 | -1) => void;
  /**
   * Going back to earlier results: 'view' offers "View these results" (an earlier reply with results),
   * 'showing' marks the reply whose earlier results are on screen, undefined shows nothing.
   */
  results?: 'view' | 'showing';
  onViewResults?: (turnId: string) => void;
}

const AssistantMessage = ({
  turn, isLatest, busy, onRetry, rating = null, onRate, results, onViewResults,
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
        {/* Plain text with **bold** as <strong> elements: model output never becomes HTML. */}
        {turn.text && <p className="mb-1 personalized-search__reply">{renderInlineBold(turn.text)}</p>}
        {isDone && turn.followups?.question && (
          <p className="mb-0 mt-1 personalized-search__followup-question">{turn.followups.question}</p>
        )}
        {isDone && results === 'view' && onViewResults && (
          <Button
            variant="link"
            size="inline"
            className="personalized-search__view-results small mt-1"
            disabled={busy}
            onClick={() => onViewResults(turn.localId)}
          >
            {intl.formatMessage(messages.viewTheseResults)}
          </Button>
        )}
        {isDone && results === 'showing' && (
          <p className="small text-gray-700 mb-0 mt-1">{intl.formatMessage(messages.showingTheseResults)}</p>
        )}
        {isDone && onRate && turn.sequence && (
          <Stack direction="horizontal" gap={1} className="mt-1 personalized-search__thumbs">
            <Button
              variant="tertiary"
              size="sm"
              aria-pressed={rating === 1}
              aria-label={intl.formatMessage(messages.helpful)}
              onClick={() => onRate(turn, 1)}
            >
              <Icon src={rating === 1 ? ThumbUp : ThumbUpOffAlt} size="sm" />
            </Button>
            <Button
              variant="tertiary"
              size="sm"
              aria-pressed={rating === -1}
              aria-label={intl.formatMessage(messages.notHelpful)}
              onClick={() => onRate(turn, -1)}
            >
              <Icon src={rating === -1 ? ThumbDown : ThumbDownOffAlt} size="sm" />
            </Button>
          </Stack>
        )}
      </div>
    </div>
  );
};

export default AssistantMessage;
