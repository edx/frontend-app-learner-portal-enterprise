import { Button, CardGrid } from '@openedx/paragon';
import { useIntl } from '@edx/frontend-platform/i18n';

import messages from '../messages';
import EditorialItemCard, { RESULT_COLUMN_SIZES } from '../cards/EditorialItemCard';
import type { ItemLinks } from '../cards/EditorialItemCard';
import type { ItemCard } from '../../core/stream/types';

export interface ExcludedViewProps {
  /** Items the learner marked "Not for me", newest first. */
  items: ItemCard[];
  links: ItemLinks;
  onRestore: (item: ItemCard) => void;
  onOpen?: (item: ItemCard) => void;
}

/**
 * The Excluded tab: what the learner marked "Not for me" (left out of every search in this enterprise),
 * each with "Include again", which lets it back into results.
 */
const ExcludedView = ({
  items, links, onRestore, onOpen,
}: ExcludedViewProps) => {
  const intl = useIntl();
  return (
    <div className="personalized-search__excluded">
      <p className="text-gray-700 mb-4">{intl.formatMessage(messages.excludedIntro)}</p>
      <CardGrid columnSizes={RESULT_COLUMN_SIZES}>
        {items.map((item) => (
          <EditorialItemCard
            key={item.item_id}
            item={{ ...item, status: undefined, why: null }}
            links={links}
            onOpen={onOpen}
            footer={(
              <Button
                variant="outline-primary"
                size="sm"
                className="personalized-search__card-control"
                aria-label={intl.formatMessage(messages.includeAgainItem, { title: item.title })}
                onClick={() => onRestore(item)}
              >
                {intl.formatMessage(messages.includeAgain)}
              </Button>
            )}
          />
        ))}
      </CardGrid>
    </div>
  );
};

export default ExcludedView;
