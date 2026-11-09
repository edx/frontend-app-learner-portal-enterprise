import { useEffect, useRef } from 'react';
import { Chip, Stack } from '@openedx/paragon';
import { useIntl } from '@edx/frontend-platform/i18n';

import messages from '../messages';
import type { AssistantTurn } from '../../core/stream/types';
import Composer from './Composer';
import FollowUpChips from './FollowUpChips';
import MessageList from './MessageList';

export interface ChatPaneProps {
  turns: AssistantTurn[];
  openingChips: string[];
  busy: boolean;
  draft: string;
  announcement: string;
  onDraftChange: (draft: string) => void;
  onSend: (message: string) => void;
  onStop: () => void;
  onRetry: (turnId: string) => void;
}

const ChatPane = ({
  turns, openingChips, busy, draft, announcement,
  onDraftChange, onSend, onStop, onRetry,
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

  const latest = turns[turns.length - 1];
  const chips = latest?.status === 'done' ? latest.followups?.suggestions ?? [] : [];

  return (
    <section className="personalized-search__chat" aria-label={intl.formatMessage(messages.chatPaneLabel)}>
      <div className="personalized-search__chat-scroll">
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
                    if (!busy) { onSend(chip); }
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
          />
        )}
      </div>
      {chips.length > 0 && (
        <FollowUpChips suggestions={chips} disabled={busy} onSelect={onSend} />
      )}
      <Composer
        ref={composerRef}
        draft={draft}
        disabled={busy}
        onDraftChange={onDraftChange}
        onSend={onSend}
        onStop={onStop}
      />
      <p className="x-small text-gray-500 mt-2 mb-0">{intl.formatMessage(messages.disclaimer)}</p>
      <div className="sr-only" aria-live="polite" aria-atomic="true">{announcement}</div>
    </section>
  );
};

export default ChatPane;
