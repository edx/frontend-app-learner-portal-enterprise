import { useEffect, useRef } from 'react';
import { Button, Chip, Stack } from '@openedx/paragon';
import { useIntl } from '@edx/frontend-platform/i18n';

import messages from '../messages';
import type { AssistantTurn } from '../stream/types';
import Composer from './Composer';
import MessageList from './MessageList';

export interface ChatPaneProps {
  turns: AssistantTurn[];
  openingChips: string[];
  busy: boolean;
  draft: string;
  announcement: string;
  onDraftChange: (draft: string) => void;
  onSend: (message: string) => void;
  onNewChat: () => void;
  onViewPage: (turnId: string) => void;
  onShowLastRecommendations: (turnId: string) => void;
}

const ChatPane = ({
  turns, openingChips, busy, draft, announcement,
  onDraftChange, onSend, onNewChat, onViewPage, onShowLastRecommendations,
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

  return (
    <section className="personalized-search__chat" aria-label={intl.formatMessage(messages.chatPaneLabel)}>
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
        <>
          <div className="d-flex justify-content-end mb-2">
            <Button variant="outline-primary" size="sm" disabled={busy} onClick={onNewChat}>
              {intl.formatMessage(messages.newChat)}
            </Button>
          </div>
          <MessageList
            turns={turns}
            busy={busy}
            onSend={onSend}
            onViewPage={onViewPage}
            onShowLastRecommendations={onShowLastRecommendations}
          />
        </>
      )}
      <Composer
        ref={composerRef}
        draft={draft}
        disabled={busy}
        onDraftChange={onDraftChange}
        onSend={onSend}
      />
      <div className="sr-only" aria-live="polite" aria-atomic="true">{announcement}</div>
    </section>
  );
};

export default ChatPane;
