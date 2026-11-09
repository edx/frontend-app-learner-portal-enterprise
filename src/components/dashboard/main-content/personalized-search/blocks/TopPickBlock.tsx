import { Button, Icon, Stack } from '@openedx/paragon';
import { Add, AutoAwesome, CheckCircle } from '@openedx/paragon/icons';
import { useIntl } from '@edx/frontend-platform/i18n';

import messages from '../ui/messages';
import type { TopPickProps } from '../core/stream/types';
import EditorialItemCard from '../ui/cards/EditorialItemCard';
import type { BlockRenderContext } from './blockRegistry';

/**
 * The top pick (wireframe D2): the item's card beside a lighter details block with the reason, the
 * learner's preferences it meets, and More like this / Not for me.
 */
const TopPickBlock = ({
  item, reason, checks, ctx,
}: TopPickProps & { ctx: BlockRenderContext }) => {
  const intl = useIntl();
  if (ctx.dismissedIds?.has(item.item_id)) { return null; }
  return (
    <section className="personalized-search__top-pick bg-light-300 d-flex flex-wrap rounded p-3">
      <div className="personalized-search__top-pick-card mr-md-4 mb-3 mb-md-0">
        <EditorialItemCard
          item={{ ...item, why: null }}
          links={ctx.links}
          saved={ctx.savedIds?.has(item.item_id) ?? false}
          onToggleSave={ctx.onToggleSave}
          onOpen={ctx.onOpenItem}
        />
      </div>
      <div className="personalized-search__top-pick-details flex-grow-1">
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
      </div>
    </section>
  );
};

export default TopPickBlock;
