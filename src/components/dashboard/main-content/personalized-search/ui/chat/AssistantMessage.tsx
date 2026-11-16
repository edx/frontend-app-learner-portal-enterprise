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
  /** Only the latest turn offers Retry. */
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
  /** Where the learner signs in again and returns here (offered when the session expired). */
  getSignInUrl?: () => string;
}

const AssistantMessage = ({
  turn, isLatest, busy, onRetry, rating = null, onRate, results, onViewResults, getSignInUrl,
}: AssistantMessageProps) => {
  const intl = useIntl();
  const isStreaming = turn.status === 'streaming';
  const isDone = turn.status === 'done';
  // The follow-up question heads its chips: without any (a distress reply may send none), it's left out.
  const followupQuestion = (turn.followups?.suggestions?.length || turn.followups?.ideas?.length)
    ? turn.followups.question : null;

  if (turn.status === 'error') {
    const {
      message, asAlert, canRetry, signIn, retryLabel = messages.retry, variant = 'danger',
    } = presentTurnError(turn.error);
    let retry: JSX.Element | false = canRetry && isLatest && (
      <Button variant="outline-primary" size="sm" disabled={busy} onClick={() => onRetry(turn.localId)}>
        {intl.formatMessage(retryLabel)}
      </Button>
    );
    if (signIn && isLatest && getSignInUrl) {
      retry = (
        <Button as="a" href={getSignInUrl()} variant="primary" size="sm">
          {intl.formatMessage(messages.signIn)}
        </Button>
      );
    }
    return (
      <div className="personalized-search__assistant mb-3" data-turn-status={turn.status}>
        {asAlert ? (
          <Alert variant={variant} className="mb-0" actions={retry ? [retry] : []}>
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
        {turn.text && <p className="mb-1 personalized-search__reply">{renderInlineBold(turn.text, { partial: !isDone })}</p>}
        {isDone && followupQuestion && (
          <p className="mb-0 mt-1 personalized-search__followup-question">{followupQuestion}</p>
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
