import { useEffect, useMemo, useRef } from 'react';
import classNames from 'classnames';
import {
  Alert, Button, Icon, Skeleton, Stack, Toast,
} from '@openedx/paragon';
import { AutoAwesome } from '@openedx/paragon/icons';
import { useIntl } from '@edx/frontend-platform/i18n';

import messages from '../messages';
import {
  hasPage, promotedTopPick, selectPageTurn, selectShownTurn,
} from '../../core/selectors';
import type { ExplainScope } from '../../core/analytics';
import type { AssistantTurn, ItemCard, PageBlock } from '../../core/stream/types';
import { defaultBlockRegistry, renderBlock } from '../../blocks/blockRegistry';
import ResultsSkeleton from './ResultsSkeleton';
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
  /** A failed change hides the Undo notice; its Alert sits above the results tabs. */
  feedbackError?: boolean;
  onClearNotice?: () => void;
  /** Sends a chat message for the learner (More like this). */
  onAsk?: (message: string) => void;
  /** Usage events (KD-12). */
  onOpenItem?: (item: ItemCard) => void;
  onExplain?: (scope: ExplainScope, item?: ItemCard) => void;
  /** Leaves an earlier reply's results (the "Earlier results" banner) for the newest ones. */
  onBackToLatest?: () => void;
  /** Moves focus to the results when it changes (not on mount): after the learner picks which results show. */
  focusRequest?: number;
}

const LearningPagePane = ({
  turns, viewedTurnId, links, reducedMotion, savedIds, dismissedIds, onToggleSave,
  onDismiss, undoItem, onUndo, feedbackError, onClearNotice, onAsk, onOpenItem, onExplain, onBackToLatest,
  focusRequest, registry = defaultBlockRegistry,
}: LearningPagePaneProps) => {
  const intl = useIntl();
  const paneRef = useRef<HTMLElement>(null);
  // Once a live turn is past understanding the message (it's searching or writing), its results replace
  // the previous ones: placeholders first, then its blocks top to bottom. Until then (or for an
  // off-topic turn) the previous results stay.
  const latest = turns[turns.length - 1];
  const pageTurn = selectShownTurn(turns, viewedTurnId);
  const loadingTurn = pageTurn?.status === 'streaming' ? pageTurn : null;
  const blocks = useMemo(() => pageTurn?.blocks ?? [], [pageTurn]);
  const topPickId = blocks.find(({ block }) => block.type === 'top_pick')?.block;
  const profileBlock = blocks.find(({ block }) => block.type === 'profile')?.block;
  // Not for me on the top pick moves the next compare option into its place.
  const promoted = useMemo(() => promotedTopPick(blocks, dismissedIds) ?? undefined, [blocks, dismissedIds]);
  const ctx = useMemo(() => ({
    links,
    itemTitles: itemTitlesOf(blocks),
    savedIds,
    dismissedIds,
    onToggleSave,
    onDismiss,
    onAsk,
    topPickId: promoted?.item.item_id ?? (topPickId?.type === 'top_pick' ? topPickId.props.item.item_id : undefined),
    promotedTopPick: promoted,
    profile: profileBlock?.type === 'profile' ? profileBlock.props : undefined,
    onOpenItem,
    onExplain,
  }), [blocks, links, savedIds, dismissedIds, onToggleSave, onDismiss, onAsk, topPickId, promoted, profileBlock,
    onOpenItem, onExplain]);

  // New results start at the top: the results pane scrolls back to its top when another turn's results
  // (or their placeholders) take over, including a search reopened from History or an earlier turn
  // chosen in the chat. In the wide layout the pane is its own scroll container; on phones the page
  // scrolls, so it brings the pane's top into view (its scroll-margin keeps a gap). Not on mount, so
  // returning to the tab doesn't jump; a search restored from the URL arrives after mount but finds the
  // pane already at its top, so nothing scrolls. (Scroll anchoring is off for
  // the page by a CSS rule while the pane is in it, so growing results don't drag the view down.)
  const shownTurnId = pageTurn?.localId ?? null;
  const lastShownTurnId = useRef(shownTurnId);
  useEffect(() => {
    if (shownTurnId === lastShownTurnId.current) { return; }
    lastShownTurnId.current = shownTurnId;
    const pane = paneRef.current;
    if (!shownTurnId || !pane) { return; }
    const scroller = pane.closest('.personalized-search__results-scroll') as HTMLElement | null;
    if (scroller) {
      if (scroller.scrollTop > 0) { scroller.scrollTop = 0; }
      return;
    }
    if (pane.getBoundingClientRect().top < 0) {
      pane.scrollIntoView({ block: 'start', behavior: reducedMotion ? 'auto' : 'smooth' });
    }
  }, [shownTurnId, reducedMotion]);

  // "View these results" and "Back to latest results" put focus on the results they show (scrolling is
  // left to the effect above).
  const lastFocusRequest = useRef(focusRequest);
  useEffect(() => {
    if (focusRequest === lastFocusRequest.current) { return; }
    lastFocusRequest.current = focusRequest;
    paneRef.current?.focus({ preventScroll: true });
  }, [focusRequest]);

  // When the Undo notice closes, its focus would fall to the page. Undo puts it on the restored card's link;
  // Close or the timeout on the results. Only if focus was in the notice or lost, so a learner who has moved
  // on keeps their place.
  const focusAfterNotice = useRef<string | null>(null);
  useEffect(() => {
    const itemId = focusAfterNotice.current;
    if (itemId === null || undoItem) { return; }
    focusAfterNotice.current = null;
    const active = document.activeElement;
    if (active && active !== document.body && !active.closest('.pgn__toast')) { return; }
    const card = Array.from(paneRef.current?.querySelectorAll<HTMLElement>('[data-item-id]') ?? [])
      .find((el) => el.dataset.itemId === itemId);
    (card?.querySelector<HTMLElement>('a') ?? paneRef.current)?.focus();
  }, [undoItem]);

  // The registry's `top` blocks (the headline and the plan) share the row above the rest, so a plan
  // still shows when a turn has no headline. The others render in the order they stream, which is page
  // order (the compose prompt writes them top to bottom), so a new block only ever appears below the
  // ones already shown. Consecutive sections share one "More options" group.
  const { top, body } = useMemo(() => registry.layout(blocks), [registry, blocks]);
  const segments = useMemo(() => {
    const out: Array<{ key: string; entries: PageBlock[] }> = [];
    body.forEach((entry) => {
      // The profile shows through the header's "Why these?".
      if (entry.block.type === 'profile') { return; }
      const last = out[out.length - 1];
      if (entry.block.type === 'item_section' && last?.entries[0].block.type === 'item_section') {
        last.entries.push(entry);
      } else {
        out.push({ key: entry.id, entries: [entry] });
      }
    });
    return out;
  }, [body]);
  // A caveat from the latest finished turn shows above the previous results when that turn has none of its
  // own; while the learner views an earlier reply, only that reply's caveat (in its blocks) shows.
  const standaloneCaveat = latest?.status === 'done' && latest !== pageTurn && !hasPage(latest)
    && pageTurn === selectPageTurn(turns, null)
    ? latest.blocks.find(({ block }) => block.type === 'caveat') : undefined;
  const loading = !!pageTurn && pageTurn.status === 'streaming';
  const has = (type: string) => blocks.some(({ block }) => block.type === type);
  const reachedCards = has('compare') || has('item_section');
  // Earlier results (the learner went back to an older reply): say which, with a way back.
  const latestPageId = selectPageTurn(turns, null)?.localId ?? null;
  const viewingEarlier = !!pageTurn && !loadingTurn && pageTurn.localId !== latestPageId;
  const blockClass = classNames('personalized-search__block', { 'personalized-search__block--enter': !reducedMotion });

  return (
    <section
      ref={paneRef}
      tabIndex={-1}
      className="personalized-search__page"
      aria-label={intl.formatMessage(messages.pagePaneLabel)}
      data-turn-id={pageTurn?.localId}
    >
      <Toast
        // One notice per hidden card, so each gets its full time before it closes.
        key={undoItem?.item_id}
        show={!!undoItem && !feedbackError}
        onClose={() => {
          focusAfterNotice.current = '';
          onClearNotice?.();
        }}
        action={{
          label: intl.formatMessage(messages.undo),
          onClick: () => {
            focusAfterNotice.current = undoItem?.item_id ?? '';
            onUndo?.();
          },
        }}
      >
        {undoItem ? intl.formatMessage(messages.hiddenItem, { title: undoItem.title }) : ''}
      </Toast>
      {standaloneCaveat && (
        <div className="mb-4" data-block-id={standaloneCaveat.id}>{renderBlock(standaloneCaveat.block, ctx, registry)}</div>
      )}
      {viewingEarlier && (
        <Alert
          variant="info"
          className="mb-4 personalized-search__earlier-results"
          actions={onBackToLatest ? [(
            <Button key="back" variant="primary" size="sm" onClick={onBackToLatest}>
              {intl.formatMessage(messages.backToLatest)}
            </Button>
          )] : []}
        >
          {intl.formatMessage(messages.earlierResults, { message: pageTurn?.userMessage ?? '' })}
        </Alert>
      )}
      {!pageTurn ? (
        <p className="text-gray-700 mb-0">{intl.formatMessage(messages.emptyPage)}</p>
      ) : (
        <Stack gap={4}>
          {top.length > 0 && (
            // The headline row keeps "A suggested order" in its top-right corner. The plan streams last (it
            // names items already shown), so the corner holds a placeholder until it arrives and closes if the
            // turn ends without one.
            <div className="d-flex flex-wrap align-items-start personalized-search__page-top">
              {top.map(({ entry, className }) => (
                <div key={entry.id} className={classNames(blockClass, className)} data-block-id={entry.id}>
                  {renderBlock(entry.block, ctx, registry)}
                </div>
              ))}
              {!has('plan') && loading && (
                <div className="personalized-search__plan-col mb-3" data-skeleton="plan" aria-hidden>
                  <Skeleton height={18} width="70%" className="mb-2" />
                  <Skeleton count={3} />
                </div>
              )}
            </div>
          )}
          {segments.map(({ key, entries }) => (
            entries[0].block.type === 'item_section' ? (
              <div key={key} className="personalized-search__more-options">
                <p className="personalized-search__eyebrow small font-weight-bold text-uppercase mb-3">
                  <Icon src={AutoAwesome} size="xs" className="mr-1 text-danger-500 d-inline-block" />
                  {intl.formatMessage(messages.moreOptions)}
                </p>
                <Stack gap={4}>
                  {entries.map(({ id, block }) => (
                    <div key={id} className={blockClass} data-block-id={id}>
                      {renderBlock(block, ctx, registry)}
                    </div>
                  ))}
                </Stack>
              </div>
            ) : (
              <div key={key} className={blockClass} data-block-id={key}>
                {renderBlock(entries[0].block, ctx, registry)}
              </div>
            )
          ))}
          {loading && (
            <ResultsSkeleton
              header={!has('page_header')}
              topPick={!has('top_pick') && !reachedCards}
              cards
            />
          )}
        </Stack>
      )}
    </section>
  );
};

export default LearningPagePane;
