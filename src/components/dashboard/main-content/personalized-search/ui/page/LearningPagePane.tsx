import { useEffect, useMemo, useRef } from 'react';
import classNames from 'classnames';
import {
  Alert, Badge, Icon, Stack, Toast,
} from '@openedx/paragon';
import { AutoAwesome } from '@openedx/paragon/icons';
import { useIntl } from '@edx/frontend-platform/i18n';

import messages from '../messages';
import { selectPageTurn } from '../../core/selectors';
import type { AssistantTurn, ItemCard, PageBlock } from '../../core/stream/types';
import { defaultBlockRegistry, renderBlock } from '../../blocks/blockRegistry';
import type { BlockRegistry } from '../../blocks/blockRegistry';
import type { ItemLinks } from '../cards/EditorialItemCard';

/** Set on <html> while the pane is mounted; the stylesheet turns scroll anchoring off for it. */
export const SCROLL_ANCHOR_OFF = 'data-personalized-search-results';

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
  onExplain?: (scope: 'tile' | 'set' | 'order', item?: ItemCard) => void;
  /** Debug mode (`?debug=true`): mark results replayed from the response cache and the tokens saved. */
  showCacheMarks?: boolean;
}

const LearningPagePane = ({
  turns, viewedTurnId, pageFocusRequest, links, reducedMotion, savedIds, dismissedIds, onToggleSave,
  onDismiss, undoItem, onUndo, feedbackError, onClearNotice, onAsk, onOpenItem, onExplain,
  showCacheMarks = false, registry = defaultBlockRegistry,
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

  // Results update in place, above wherever the learner is. The browser's scroll anchoring would pin
  // the content at the bottom of the window (the footer) and scroll down as the new results grow,
  // dragging the view away from their top, so it's off while the pane is mounted.
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute(SCROLL_ANCHOR_OFF, '');
    return () => root.removeAttribute(SCROLL_ANCHOR_OFF);
  }, []);

  // New results (a turn's first block) bring the results column back to its top when the learner has
  // scrolled past it; the page scrolls the results, so a refinement would otherwise land off screen.
  // Not on mount, so reopening a search or returning to the tab doesn't jump.
  const shownTurnId = pageTurn?.localId ?? null;
  const lastShownTurnId = useRef(shownTurnId);
  useEffect(() => {
    if (shownTurnId === lastShownTurnId.current) { return; }
    lastShownTurnId.current = shownTurnId;
    const pane = paneRef.current;
    const column = (pane?.closest('.personalized-search__page-col') as HTMLElement | null) ?? pane;
    if (!shownTurnId || !column) { return; }
    const { top } = column.getBoundingClientRect();
    if (top < 0) {
      window.scrollTo({ top: Math.max(top + window.scrollY - 16, 0), behavior: reducedMotion ? 'auto' : 'smooth' });
    }
  }, [shownTurnId, reducedMotion]);

  const { top, body } = useMemo(() => registry.layout(blocks), [registry, blocks]);
  // Sections are grouped under "More options", one group per row so every card has the same width.
  const groups = body.filter(({ block }) => block.type === 'item_section');
  // The profile renders inside the header's "Why these?", not as a block of its own; caveats lead the pane.
  const others = body.filter(({ block }) => !['item_section', 'profile', 'caveat'].includes(block.type));
  // The latest turn's caveat shows even when that turn has no results of its own (the previous ones stay).
  const latest = turns[turns.length - 1];
  const caveat = (latest?.status === 'done' ? latest.blocks : blocks).find(({ block }) => block.type === 'caveat');
  // Debug only: blocks the response cache replayed (the compose call was a hit) get a dashed "Cached" mark.
  const cacheDebug = showCacheMarks ? pageTurn?.timing?.debug : undefined;
  const cached = cacheDebug?.compose?.cache === 'hit';
  const savedOutput = cacheDebug?.tokens_saved?.output_tokens;
  const blockClass = classNames('personalized-search__block', {
    'personalized-search__block--enter': !reducedMotion,
    'personalized-search__block--cached': cached,
  });

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
      {cached && (
        <Badge variant="warning" className="mb-3" data-testid="personalized-search-from-cache">
          {savedOutput ? `From cache · saved ${savedOutput.toLocaleString('en-US')} output tokens` : 'From cache'}
        </Badge>
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
