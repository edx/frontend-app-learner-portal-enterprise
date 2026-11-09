import { Col, Icon, Row } from '@openedx/paragon';
import { AutoAwesome } from '@openedx/paragon/icons';
import { useIntl } from '@edx/frontend-platform/i18n';

import messages from '../ui/messages';
import type { CompareProps } from '../core/stream/types';
import CompactItemCard from '../ui/cards/CompactItemCard';
import type { BlockRenderContext } from './blockRegistry';

/** "Compare top options" (wireframe D2): a "Best for …" headline above each mini card. */
const CompareBlock = ({ options, ctx }: CompareProps & { ctx: BlockRenderContext }) => {
  const intl = useIntl();
  const visible = options.filter(({ item }) => !ctx.dismissedIds?.has(item.item_id));
  if (visible.length === 0) { return null; }
  return (
    <section className="personalized-search__compare">
      <p className="personalized-search__eyebrow small font-weight-bold text-uppercase mb-3">
        <Icon src={AutoAwesome} size="xs" className="mr-1 text-danger-500 d-inline-block" />
        {intl.formatMessage(messages.compareTopOptions)}
      </p>
      <Row>
        {visible.map(({ best_for: bestFor, item }) => (
          <Col key={item.item_id} md={12 / Math.max(visible.length, 2)} className="mb-3 d-flex flex-column">
            <h4 className="h4 mb-2">{intl.formatMessage(messages.bestFor, { bestFor })}</h4>
            <CompactItemCard
              item={item}
              links={ctx.links}
              saved={ctx.savedIds?.has(item.item_id) ?? false}
              onToggleSave={ctx.onToggleSave}
              isTopPick={ctx.topPickId === item.item_id}
            />
          </Col>
        ))}
      </Row>
    </section>
  );
};

export default CompareBlock;
