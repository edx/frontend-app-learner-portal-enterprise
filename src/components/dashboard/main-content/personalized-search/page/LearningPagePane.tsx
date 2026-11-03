import { useEffect, useMemo, useRef } from 'react';
import classNames from 'classnames';
import { Stack } from '@openedx/paragon';
import { useIntl } from '@edx/frontend-platform/i18n';

import messages from '../messages';
import type { AssistantTurn, PageBlock } from '../stream/types';
import { renderBlock } from './blockRegistry';

/**
 * The turn whose page is shown: the viewed turn if it has a page, else the latest turn with a
 * page. Off-topic, text-only, stopped and errored turns have no blocks, so the previous page stays.
 */
export const selectPageTurn = (turns: AssistantTurn[], viewedTurnId: string | null): AssistantTurn | null => {
  if (viewedTurnId) {
    const viewed = turns.find((turn) => turn.localId === viewedTurnId);
    if (viewed && viewed.blocks.length > 0) { return viewed; }
  }
  for (let i = turns.length - 1; i >= 0; i -= 1) {
    if (turns[i].blocks.length > 0) { return turns[i]; }
  }
  return null;
};

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
  enterpriseSlug: string;
  reducedMotion: boolean;
}

const LearningPagePane = ({
  turns, viewedTurnId, pageFocusRequest, enterpriseSlug, reducedMotion,
}: LearningPagePaneProps) => {
  const intl = useIntl();
  const paneRef = useRef<HTMLElement>(null);
  const pageTurn = selectPageTurn(turns, viewedTurnId);
  const blocks = useMemo(() => pageTurn?.blocks ?? [], [pageTurn]);
  const ctx = useMemo(() => ({ enterpriseSlug, itemTitles: itemTitlesOf(blocks) }), [blocks, enterpriseSlug]);

  useEffect(() => {
    if (pageFocusRequest > 0) { paneRef.current?.focus(); }
  }, [pageFocusRequest]);

  const header = blocks.find(({ block }) => block.type === 'page_header');
  const plan = blocks.find(({ block }) => block.type === 'plan');
  const body = blocks.filter((entry) => entry !== header && entry !== plan);
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
          {(header || plan) && (
            <div className="d-flex flex-wrap personalized-search__page-top">
              {header && (
                <div
                  key={header.id}
                  className={classNames(blockClass, 'personalized-search__header-col mr-4 mb-3')}
                  data-block-id={header.id}
                >
                  {renderBlock(header.block, ctx)}
                </div>
              )}
              {plan && (
                <div
                  key={plan.id}
                  className={classNames(blockClass, 'personalized-search__plan-col mb-3')}
                  data-block-id={plan.id}
                >
                  {renderBlock(plan.block, ctx)}
                </div>
              )}
            </div>
          )}
          {body.map(({ id, block }) => (
            <div key={id} className={blockClass} data-block-id={id}>
              {renderBlock(block, ctx)}
            </div>
          ))}
        </Stack>
      )}
    </section>
  );
};

export default LearningPagePane;
