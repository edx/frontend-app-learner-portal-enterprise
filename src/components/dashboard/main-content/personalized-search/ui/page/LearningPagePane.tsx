import { useEffect, useMemo, useRef } from 'react';
import classNames from 'classnames';
import { Stack } from '@openedx/paragon';
import { useIntl } from '@edx/frontend-platform/i18n';

import messages from '../messages';
import { selectPageTurn } from '../../core/selectors';
import type { AssistantTurn, PageBlock } from '../../core/stream/types';
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
}

const LearningPagePane = ({
  turns, viewedTurnId, pageFocusRequest, links, reducedMotion,
  registry = defaultBlockRegistry,
}: LearningPagePaneProps) => {
  const intl = useIntl();
  const paneRef = useRef<HTMLElement>(null);
  const pageTurn = selectPageTurn(turns, viewedTurnId);
  const blocks = useMemo(() => pageTurn?.blocks ?? [], [pageTurn]);
  const ctx = useMemo(() => ({ links, itemTitles: itemTitlesOf(blocks) }), [blocks, links]);

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
