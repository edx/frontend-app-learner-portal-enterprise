import { useEffect, useMemo, useRef } from 'react';
import classNames from 'classnames';
import {
  Alert, Icon, Stack, Toast,
} from '@openedx/paragon';
import { AutoAwesome } from '@openedx/paragon/icons';
import { useIntl } from '@edx/frontend-platform/i18n';

import messages from '../messages';
import { selectPageTurn } from '../../core/selectors';
import type { AssistantTurn, ItemCard, PageBlock } from '../../core/stream/types';
import { defaultBlockRegistry, renderBlock } from '../../blocks/blockRegistry';
import type { BlockRegistry } from '../../blocks/blockRegistry';
import type { ItemLinks } from '../cards/EditorialItemCard';

const itemTitlesOf = (blocks: PageBlock[]): Record<string, string> => Object.fromEntries(
  blocks.flatMap(({ block }) => (block.type === 'item_section'
    ? block.props.items.map((item) => [item.item_id, item.title])
    : [])),
);

export interface LearningPagePaneProps {
  turns: AssistantTurn[];
  viewedTurnId: string | null;
  /** Each increment moves focus to the pane. */
  pageFocusRequest: number;
  /** How item cards link to course and program pages (supplied by the host). */
  links: ItemLinks;
  /** Block renderers; Block catalog v1 by default. */
  registry?: BlockRegistry;
  reducedMotion: boolean;
  /** Item feedback (REQ-009). */
  savedIds?: ReadonlySet<string>;
  dismissedIds?: ReadonlySet<string>;
  onToggleSave?: (item: ItemCard) => void;
  onDismiss?: (item: ItemCard) => void;
  /** The card just hidden by Not interested, offered for Undo. */
  undoItem?: ItemCard | null;
  onUndo?: () => void;
  feedbackError?: boolean;
  onClearNotice?: () => void;
  /** Sends a chat message for the learner (More like this). */
  onAsk?: (message: string) => void;
  /** Usage events (KD-12). */
  onOpenItem?: (item: ItemCard) => void;
  onExplain?: (scope: 'tile' | 'set', item?: ItemCard) => void;
}

const LearningPagePane = ({
  turns, viewedTurnId, pageFocusRequest, links, reducedMotion, savedIds, dismissedIds, onToggleSave,
  onDismiss, undoItem, onUndo, feedbackError, onClearNotice, onAsk, onOpenItem, onExplain,
  registry = defaultBlockRegistry,
}: LearningPagePaneProps) => {
  const intl = useIntl();
  const paneRef = useRef<HTMLElement>(null);
  const pageTurn = selectPageTurn(turns, viewedTurnId);
  const blocks = useMemo(() => pageTurn?.blocks ?? [], [pageTurn]);
  const searchQuery = pageTurn?.userMessage ?? undefined;
  const topPickId = blocks.find(({ block }) => block.type === 'top_pick')?.block;
  const profileBlock = blocks.find(({ block }) => block.type === 'profile')?.block;
  const ctx = useMemo(() => ({
    links,
    itemTitles: itemTitlesOf(blocks),
    savedIds,
    dismissedIds,
    onToggleSave,
    onDismiss,
    searchQuery,
    onAsk,
    topPickId: topPickId?.type === 'top_pick' ? topPickId.props.item.item_id : undefined,
    profile: profileBlock?.type === 'profile' ? profileBlock.props : undefined,
    onOpenItem,
    onExplain,
  }), [blocks, links, savedIds, dismissedIds, onToggleSave, onDismiss, searchQuery, onAsk, topPickId, profileBlock,
    onOpenItem, onExplain]);

  useEffect(() => {
    if (pageFocusRequest > 0) { paneRef.current?.focus(); }
  }, [pageFocusRequest]);

  const { top, body } = useMemo(() => registry.layout(blocks), [registry, blocks]);
  // Sections are grouped under "More options", one group per row so every card has the same width.
  const groups = body.filter(({ block }) => block.type === 'item_section');
  // The profile renders inside the header's "Why these?", not as a block of its own; caveats lead the pane.
  const others = body.filter(({ block }) => !['item_section', 'profile', 'caveat'].includes(block.type));
  // The latest turn's caveat shows even when that turn has no results of its own (the previous ones stay).
  const latest = turns[turns.length - 1];
  const caveat = (latest?.status === 'done' ? latest.blocks : blocks).find(({ block }) => block.type === 'caveat');
  const blockClass = classNames('personalized-search__block', { 'personalized-search__block--enter': !reducedMotion });

  return (
    <section
      ref={paneRef}
      tabIndex={-1}
      className="personalized-search__page"
      aria-label={intl.formatMessage(messages.pagePaneLabel)}
      data-turn-id={pageTurn?.localId}
    >
      {feedbackError && (
        <Alert variant="danger" dismissible onClose={onClearNotice} className="mb-3">
          {intl.formatMessage(messages.feedbackError)}
        </Alert>
      )}
      <Toast
        show={!!undoItem && !feedbackError}
        onClose={() => onClearNotice?.()}
        action={{ label: intl.formatMessage(messages.undo), onClick: () => onUndo?.() }}
      >
        {undoItem ? intl.formatMessage(messages.hiddenItem, { title: undoItem.title }) : ''}
      </Toast>
      {caveat && (
        <div className="mb-4" data-block-id={caveat.id}>{renderBlock(caveat.block, ctx, registry)}</div>
      )}
      {!pageTurn ? (
        <p className="text-gray-700 mb-0">{intl.formatMessage(messages.emptyPage)}</p>
      ) : (
        <Stack gap={4}>
          {top.length > 0 && (
            <div className="d-flex flex-wrap personalized-search__page-top">
              {top.map(({ entry, className }) => (
                <div
                  key={entry.id}
                  className={classNames(blockClass, className)}
                  data-block-id={entry.id}
                >
                  {renderBlock(entry.block, ctx, registry)}
                </div>
              ))}
            </div>
          )}
          {others.map(({ id, block }) => (
            <div key={id} className={blockClass} data-block-id={id}>
              {renderBlock(block, ctx, registry)}
            </div>
          ))}
          {groups.length > 0 && (
            <div className="personalized-search__more-options">
              <p className="personalized-search__eyebrow small font-weight-bold text-uppercase mb-3">
                <Icon src={AutoAwesome} size="xs" className="mr-1 text-danger-500 d-inline-block" />
                {intl.formatMessage(messages.moreOptions)}
              </p>
              <Stack gap={4}>
                {groups.map(({ id, block }) => (
                  <div key={id} className={blockClass} data-block-id={id}>
                    {renderBlock(block, ctx, registry)}
                  </div>
                ))}
              </Stack>
            </div>
          )}
        </Stack>
      )}
    </section>
  );
};

export default LearningPagePane;
