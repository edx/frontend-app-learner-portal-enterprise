import { useEffect, useLayoutEffect, useRef } from 'react';
import { Chip, Stack } from '@openedx/paragon';
import { useIntl } from '@edx/frontend-platform/i18n';

import messages from '../messages';
import type { AssistantTurn } from '../../core/stream/types';
import type { PromptSource } from '../../core/analytics';
import Composer from './Composer';
import FollowUpChips from './FollowUpChips';
import MessageList from './MessageList';

/** How close to the bottom (px) still counts as following the conversation (subpixel and rounding slack). */
const AT_BOTTOM_SLACK_PX = 24;

export interface ChatPaneProps {
  turns: AssistantTurn[];
  openingChips: string[];
  busy: boolean;
  draft: string;
  announcement: string;
  onDraftChange: (draft: string) => void;
  /** Sends a message; `source` says how (typed by default), `chipLabel` names a fixed chip. */
  onSend: (message: string, source?: PromptSource, chipLabel?: string) => void;
  onStop: () => void;
  onRetry: (turnId: string) => void;
  ratings?: Record<string, 1 | -1 | null>;
  onRate?: (turn: AssistantTurn, rating: 1 | -1) => void;
  /** Going back to an earlier reply's results. */
  viewedTurnId?: string | null;
  onViewResults?: (turnId: string) => void;
}

const ChatPane = ({
  turns, openingChips, busy, draft, announcement,
  onDraftChange, onSend, onStop, onRetry, ratings, onRate, viewedTurnId, onViewResults,
}: ChatPaneProps) => {
  const intl = useIntl();
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const wasBusy = useRef(busy);

  // Return focus to the composer when a turn finishes (REQ-015).
  useEffect(() => {
    if (wasBusy.current && !busy) {
      composerRef.current?.focus();
    }
    wasBusy.current = busy;
  }, [busy]);

  // From send (Enter or a chip) until the turn finishes, the conversation snaps to its newest message so
  // the streaming reply stays in view, and one last snap when the turn finishes shows its follow-up
  // question. A learner who scrolls up to reread is left there: the snapping stops until they scroll back
  // to the bottom or send again.
  const scrollRef = useRef<HTMLDivElement>(null);
  const wasStreaming = useRef(busy);
  const atBottom = useRef(true);
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (busy && !wasStreaming.current) { atBottom.current = true; }
    if (el && (busy || wasStreaming.current) && atBottom.current) { el.scrollTop = el.scrollHeight; }
    wasStreaming.current = busy;
  }, [busy, turns]);
  const onScroll = () => {
    const el = scrollRef.current;
    if (el) { atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight <= AT_BOTTOM_SLACK_PX; }
  };

  const latest = turns[turns.length - 1];
  const followups = latest?.status === 'done' ? latest.followups : null;
  const chips = followups?.suggestions ?? [];
  const ideas = followups?.ideas ?? [];

  return (
    <section className="personalized-search__chat" aria-label={intl.formatMessage(messages.chatPaneLabel)}>
      <div
        ref={scrollRef}
        className="personalized-search__chat-scroll"
        onScroll={onScroll}
        data-testid="chat-scroll"
      >
        {turns.length === 0 ? (
          <div className="personalized-search__opening">
            <div className="personalized-search__greeting mb-3">
              <p className="h4 mb-1">{intl.formatMessage(messages.greeting)}</p>
              <p className="mb-0 text-gray-700">{intl.formatMessage(messages.greetingDetail)}</p>
            </div>
            <Stack direction="horizontal" gap={2} className="flex-wrap">
              {openingChips.map((chip) => (
                <Chip
                  key={chip}
                  disabled={busy}
                  onClick={() => {
                    if (!busy) { onSend(chip, 'starter_chip', chip); }
                  }}
                >
                  {chip}
                </Chip>
              ))}
            </Stack>
          </div>
        ) : (
          <MessageList
            turns={turns}
            busy={busy}
            onRetry={onRetry}
            ratings={ratings}
            onRate={onRate}
            viewedTurnId={viewedTurnId}
            onViewResults={onViewResults}
          />
        )}
      </div>
      {(chips.length > 0 || ideas.length > 0) && (
        <FollowUpChips
          suggestions={chips}
          ideas={ideas}
          disabled={busy}
          onSelect={(chip) => onSend(chip, 'followup_chip', chip)}
          onSelectIdea={(idea) => onSend(idea, 'suggested_chip')}
        />
      )}
      <Composer
        ref={composerRef}
        draft={draft}
        disabled={busy}
        onDraftChange={onDraftChange}
        onSend={(message) => onSend(message, 'typed')}
        onStop={onStop}
      />
      <p className="x-small text-gray-500 mt-2 mb-0">{intl.formatMessage(messages.disclaimer)}</p>
      <div className="sr-only" aria-live="polite" aria-atomic="true">{announcement}</div>
    </section>
  );
};

export default ChatPane;
