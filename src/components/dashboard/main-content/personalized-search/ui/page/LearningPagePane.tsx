import { useEffect, useMemo, useRef } from 'react';
import classNames from 'classnames';
import {
  Alert, Button, Icon, Skeleton, Stack, Toast,
} from '@openedx/paragon';
import { AutoAwesome } from '@openedx/paragon/icons';
import { useIntl } from '@edx/frontend-platform/i18n';

import messages from '../messages';
import { selectPageTurn } from '../../core/selectors';
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
  /** Leaves an earlier reply's results (the "Earlier results" banner) for the newest ones. */
  onBackToLatest?: () => void;
}

const LearningPagePane = ({
  turns, viewedTurnId, pageFocusRequest, links, reducedMotion, savedIds, dismissedIds, onToggleSave,
  onDismiss, undoItem, onUndo, feedbackError, onClearNotice, onAsk, onOpenItem, onExplain, onBackToLatest,
  registry = defaultBlockRegistry,
}: LearningPagePaneProps) => {
  const intl = useIntl();
  const paneRef = useRef<HTMLElement>(null);
  // Once a live turn is past understanding the message (it's searching or writing), its results replace
  // the previous ones: placeholders first, then its blocks top to bottom. Until then (or for an
  // off-topic turn) the previous results stay.
  const latest = turns[turns.length - 1];
  const loadingTurn = !viewedTurnId && latest?.status === 'streaming'
    && (latest.blocks.length > 0 || latest.step === 'searching' || latest.step === 'writing') ? latest : null;
  const pageTurn = loadingTurn ?? selectPageTurn(turns, viewedTurnId);
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

  // Blocks render in the order they stream, which is page order (the compose prompt writes them top
  // to bottom), so a new block only ever appears below the ones already shown. Consecutive sections
  // share one "More options" group; the profile shows through the header's "Why these?".
  const segments = useMemo(() => {
    const out: Array<{ key: string; entries: PageBlock[] }> = [];
    blocks.forEach((entry) => {
      // The profile shows through "Why these?"; the plan sits in the header row's reserved corner.
      if (entry.block.type === 'profile' || entry.block.type === 'plan') { return; }
      const last = out[out.length - 1];
      if (entry.block.type === 'item_section' && last?.entries[0].block.type === 'item_section') {
        last.entries.push(entry);
      } else {
        out.push({ key: entry.id, entries: [entry] });
      }
    });
    return out;
  }, [blocks]);
  // A caveat from the latest finished turn shows above the previous results when that turn has none.
  const standaloneCaveat = latest?.status === 'done' && latest !== pageTurn
    ? latest.blocks.find(({ block }) => block.type === 'caveat') : undefined;
  const loading = !!pageTurn && pageTurn.status === 'streaming';
  const has = (type: string) => blocks.some(({ block }) => block.type === type);
  const reachedCards = has('compare') || has('item_section');
  const planEntry = blocks.find(({ block }) => block.type === 'plan');
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
          {segments.map(({ key, entries }) => {
            if (entries[0].block.type === 'page_header') {
              // The headline row keeps "A suggested order" in its top-right corner. The plan streams last
              // (it names items already shown), so the corner holds a placeholder until it arrives and
              // closes if the turn ends without one.
              return (
                <div key={key} className="d-flex flex-wrap align-items-start personalized-search__page-top">
                  <div className={classNames(blockClass, 'personalized-search__header-col mr-4 mb-3')} data-block-id={key}>
                    {renderBlock(entries[0].block, ctx, registry)}
                  </div>
                  {planEntry && (
                    <div className={classNames(blockClass, 'personalized-search__plan-col mb-3')} data-block-id={planEntry.id}>
                      {renderBlock(planEntry.block, ctx, registry)}
                    </div>
                  )}
                  {!planEntry && loading && (
                    <div className="personalized-search__plan-col mb-3" data-skeleton="plan" aria-hidden>
                      <Skeleton height={18} width="70%" className="mb-2" />
                      <Skeleton count={3} />
                    </div>
                  )}
                </div>
              );
            }
            return entries[0].block.type === 'item_section' ? (
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
            );
          })}
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
