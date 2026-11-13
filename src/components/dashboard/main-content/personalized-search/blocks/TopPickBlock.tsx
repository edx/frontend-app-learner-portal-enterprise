import {
  Button, Col, Icon, Row, Stack,
} from '@openedx/paragon';
import { Add, AutoAwesome, CheckCircle } from '@openedx/paragon/icons';
import { useIntl } from '@edx/frontend-platform/i18n';

import messages from '../ui/messages';
import type { TopPickProps } from '../core/stream/types';
import EditorialItemCard, { RESULT_COLUMN_SIZES } from '../ui/cards/EditorialItemCard';
import type { BlockRenderContext } from './blockRegistry';

/**
 * The top pick (wireframe D2): the item's card beside a lighter details block with the reason, the
 * learner's preferences it meets, and More like this / Not for me. The card takes one result column, so
 * it is the same width as the cards below it; the details fill the rest of the row (below it on phones).
 * When the learner removes it, the next compare option takes its place with what it is best for.
 */
const TopPickBlock = ({
  item: pick, reason: pickReason, checks: pickChecks, ctx,
}: TopPickProps & { ctx: BlockRenderContext }) => {
  const intl = useIntl();
  const removed = !!ctx.dismissedIds?.has(pick.item_id);
  const promoted = removed ? ctx.promotedTopPick : undefined;
  if (removed && !promoted) { return null; }
  const item = promoted?.item ?? pick;
  const reason = promoted ? intl.formatMessage(messages.bestFor, { bestFor: promoted.best_for }) : pickReason;
  // The checks were written for the removed pick.
  const checks = promoted ? [] : pickChecks;
  return (
    <Row as="section" className="personalized-search__top-pick bg-light-300 rounded mx-0 py-3">
      <Col {...RESULT_COLUMN_SIZES} className="mb-3 mb-md-0">
        <EditorialItemCard
          key={item.item_id}
          item={{ ...item, why: null }}
          links={ctx.links}
          saved={ctx.savedIds?.has(item.item_id) ?? false}
          onToggleSave={ctx.onToggleSave}
          onOpen={ctx.onOpenItem}
        />
      </Col>
      <Col xs={12} md={6} xl={8}>
        <h3 className="h4 text-danger-500 d-flex align-items-center mb-2">
          <Icon src={AutoAwesome} size="sm" className="mr-2" />
          {intl.formatMessage(messages.topPick)}
        </h3>
        <p className="mb-2">{reason}</p>
        {checks.length > 0 && (
          <ul className="list-unstyled mb-3">
            {checks.map((check) => (
              <li key={check} className="d-flex align-items-center small">
                <Icon src={CheckCircle} size="xs" className="text-success mr-2" />
                {check}
              </li>
            ))}
          </ul>
        )}
        <Stack direction="horizontal" gap={3}>
          {ctx.onAsk && (
            <Button
              variant="tertiary"
              size="sm"
              iconBefore={Add}
              onClick={() => ctx.onAsk?.(intl.formatMessage(messages.moreLikeThisMessage, { title: item.title }))}
            >
              {intl.formatMessage(messages.moreLikeThis)}
            </Button>
          )}
          {ctx.onDismiss && (
            <Button
              variant="tertiary"
              size="sm"
              aria-label={intl.formatMessage(messages.notForMeItem, { title: item.title })}
              onClick={() => ctx.onDismiss?.(item)}
            >
              {intl.formatMessage(messages.notForMe)}
            </Button>
          )}
        </Stack>
      </Col>
    </Row>
  );
};

export default TopPickBlock;
