import { Badge, CardGrid, Icon } from '@openedx/paragon';
import { AutoAwesome } from '@openedx/paragon/icons';
import { useIntl } from '@edx/frontend-platform/i18n';

import messages from '../ui/messages';
import type { CompareProps } from '../core/stream/types';
import EditorialItemCard, { RESULT_COLUMN_SIZES } from '../ui/cards/EditorialItemCard';
import type { BlockRenderContext } from './blockRegistry';

/**
 * "Compare top options" (wireframe D2): the same cards as the rest of the results, in the same grid, each
 * under its "Best for …" label. The label sits just above its card in a two-line slot, so the cards stay
 * aligned however long the labels are.
 */
const CompareBlock = ({ options, ctx }: CompareProps & { ctx: BlockRenderContext }) => {
  const intl = useIntl();
  // An option promoted to the top pick (the learner removed the original) shows there instead.
  const visible = options.filter(({ item }) => (
    !ctx.dismissedIds?.has(item.item_id) && item.item_id !== ctx.promotedTopPick?.item.item_id
  ));
  if (visible.length === 0) { return null; }
  return (
    <section className="personalized-search__compare">
      <p className="personalized-search__eyebrow small font-weight-bold text-uppercase mb-3">
        <Icon src={AutoAwesome} size="xs" className="mr-1 text-danger-500 d-inline-block" />
        {intl.formatMessage(messages.compareTopOptions)}
      </p>
      <CardGrid columnSizes={RESULT_COLUMN_SIZES}>
        {visible.map(({ best_for: bestFor, item }) => (
          <div key={item.item_id} className="personalized-search__compare-option d-flex flex-column h-100">
            <h4 className="h5 mb-2 personalized-search__compare-label">
              {intl.formatMessage(messages.bestFor, { bestFor })}
            </h4>
            <div className="flex-grow-1">
              <EditorialItemCard
                item={item}
                links={ctx.links}
                footer={ctx.topPickId === item.item_id && (
                  <Badge variant="light" className="text-danger-500">{intl.formatMessage(messages.topPick)}</Badge>
                )}
                saved={ctx.savedIds?.has(item.item_id) ?? false}
                onToggleSave={ctx.onToggleSave}
                onDismiss={ctx.onDismiss}
                onOpen={ctx.onOpenItem}
                onExplain={(opened) => ctx.onExplain?.('tile', opened)}
              />
            </div>
          </div>
        ))}
      </CardGrid>
    </section>
  );
};

export default CompareBlock;
