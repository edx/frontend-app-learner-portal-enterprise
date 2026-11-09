import { CardGrid } from '@openedx/paragon';

import type { ItemCard, ItemSectionProps } from '../core/stream/types';
import EditorialItemCard from '../ui/cards/EditorialItemCard';
import type { ItemLinks } from '../ui/cards/EditorialItemCard';

export interface ItemSectionBlockProps extends ItemSectionProps {
  links: ItemLinks;
  savedIds?: ReadonlySet<string>;
  dismissedIds?: ReadonlySet<string>;
  onToggleSave?: (item: ItemCard) => void;
  onDismiss?: (item: ItemCard) => void;
}

const ItemSectionBlock = ({
  label, dek, items, item_type: itemType, links, savedIds, dismissedIds, onToggleSave, onDismiss,
}: ItemSectionBlockProps) => {
  // Not interested hides the card (REQ-009); a section with nothing left disappears.
  const visible = dismissedIds ? items.filter((item) => !dismissedIds.has(item.item_id)) : items;
  if (visible.length === 0) { return null; }
  return (
    <section className="personalized-search__section" data-item-type={itemType}>
      <h3 className="h4 mb-1">{label}</h3>
      {dek && <p className="text-gray-700 mb-3">{dek}</p>}
      <CardGrid columnSizes={visible.length === 1 ? { xs: 12 } : { xs: 12, md: 6 }}>
        {visible.map((item) => (
          <EditorialItemCard
            key={item.item_id}
            item={item}
            links={links}
            saved={savedIds?.has(item.item_id) ?? false}
            onToggleSave={onToggleSave}
            onDismiss={onDismiss}
            orientation={visible.length === 1 ? 'horizontal' : 'vertical'}
          />
        ))}
      </CardGrid>
    </section>
  );
};

export default ItemSectionBlock;
