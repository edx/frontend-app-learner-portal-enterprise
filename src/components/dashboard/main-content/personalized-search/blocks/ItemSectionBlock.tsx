import { CardGrid } from '@openedx/paragon';
import { useIntl } from '@edx/frontend-platform/i18n';

import messages from '../ui/messages';
import type { ItemCard, ItemSectionProps } from '../core/stream/types';
import EditorialItemCard, { RESULT_COLUMN_SIZES } from '../ui/cards/EditorialItemCard';
import type { ItemLinks } from '../ui/cards/EditorialItemCard';

/** Cards shown per group, one row on wide screens; the rest fill a removed card. */
export const CARDS_PER_GROUP = 3;

const SECTION_NAMES = {
  course: messages.sectionCourse,
  executive_education: messages.sectionExecutiveEducation,
  program: messages.sectionProgram,
};

export interface ItemSectionBlockProps extends ItemSectionProps {
  links: ItemLinks;
  savedIds?: ReadonlySet<string>;
  dismissedIds?: ReadonlySet<string>;
  onToggleSave?: (item: ItemCard) => void;
  onDismiss?: (item: ItemCard) => void;
  searchQuery?: string;
  onOpenItem?: (item: ItemCard) => void;
  onExplain?: (scope: 'tile' | 'set' | 'order', item?: ItemCard) => void;
}

/**
 * One "More options" group: the type as an h3, "See all (n)" when the catalog total is known, one
 * explanation line, and up to three cards in the shared result grid. A removed card is replaced by the
 * next item or reserve card.
 */
const ItemSectionBlock = ({
  dek, items, reserve, total, item_type: itemType, links, savedIds, dismissedIds, onToggleSave, onDismiss,
  searchQuery, onOpenItem, onExplain,
}: ItemSectionBlockProps) => {
  const intl = useIntl();
  const pool = [...items, ...(reserve ?? [])];
  const visible = (dismissedIds ? pool.filter((item) => !dismissedIds.has(item.item_id)) : pool)
    .slice(0, CARDS_PER_GROUP);
  if (visible.length === 0) { return null; }
  const seeAllHref = total && links.getSeeAllHref && searchQuery ? links.getSeeAllHref(itemType, searchQuery) : null;
  return (
    <section className="personalized-search__section" data-item-type={itemType}>
      <div className="d-flex align-items-baseline justify-content-between">
        <h3 className="h3 mb-1">{intl.formatMessage(SECTION_NAMES[itemType])}</h3>
        {seeAllHref && (
          <links.LinkComponent to={seeAllHref}>
            {intl.formatMessage(messages.seeAll, { count: total })}
          </links.LinkComponent>
        )}
      </div>
      {dek && <p className="text-gray-700 mb-3">{dek}</p>}
      <CardGrid columnSizes={RESULT_COLUMN_SIZES}>
        {visible.map((item) => (
          <EditorialItemCard
            key={item.item_id}
            item={item}
            links={links}
            saved={savedIds?.has(item.item_id) ?? false}
            onToggleSave={onToggleSave}
            onDismiss={onDismiss}
            onOpen={onOpenItem}
            onExplain={(opened) => onExplain?.('tile', opened)}
          />
        ))}
      </CardGrid>
    </section>
  );
};

export default ItemSectionBlock;
