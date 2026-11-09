import { useEffect, useMemo, useRef } from 'react';
import classNames from 'classnames';
import { Alert, Button, Stack } from '@openedx/paragon';
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
}

const LearningPagePane = ({
  turns, viewedTurnId, pageFocusRequest, links, reducedMotion, savedIds, dismissedIds, onToggleSave,
  onDismiss, undoItem, onUndo, feedbackError, onClearNotice,
  registry = defaultBlockRegistry,
}: LearningPagePaneProps) => {
  const intl = useIntl();
  const paneRef = useRef<HTMLElement>(null);
  const pageTurn = selectPageTurn(turns, viewedTurnId);
  const blocks = useMemo(() => pageTurn?.blocks ?? [], [pageTurn]);
  const ctx = useMemo(() => ({
    links, itemTitles: itemTitlesOf(blocks), savedIds, dismissedIds, onToggleSave, onDismiss,
  }), [blocks, links, savedIds, dismissedIds, onToggleSave, onDismiss]);

  useEffect(() => {
    if (pageFocusRequest > 0) { paneRef.current?.focus(); }
  }, [pageFocusRequest]);

  const { top, body } = useMemo(() => registry.layout(blocks), [registry, blocks]);
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
      {undoItem && !feedbackError && (
        <Alert
          variant="light"
          className="mb-3"
          actions={[<Button key="undo" size="sm" onClick={onUndo}>{intl.formatMessage(messages.undo)}</Button>]}
          dismissible
          onClose={onClearNotice}
        >
          {intl.formatMessage(messages.hiddenItem, { title: undoItem.title })}
        </Alert>
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
          {body.map(({ id, block }) => (
            <div key={id} className={blockClass} data-block-id={id}>
              {renderBlock(block, ctx, registry)}
            </div>
          ))}
        </Stack>
      )}
    </section>
  );
};

export default LearningPagePane;
