import { CardGrid } from '@openedx/paragon';

import type { ItemCard, ItemSectionProps } from '../stream/types';
import EditorialItemCard from './EditorialItemCard';

export interface ItemSectionBlockProps extends ItemSectionProps {
  enterpriseSlug: string;
  savedIds?: ReadonlySet<string>;
  dismissedIds?: ReadonlySet<string>;
  onToggleSave?: (item: ItemCard) => void;
  onDismiss?: (item: ItemCard) => void;
}

const ItemSectionBlock = ({
  label, dek, items, item_type: itemType, enterpriseSlug, savedIds, dismissedIds, onToggleSave, onDismiss,
}: ItemSectionBlockProps) => {
  // Not interested hides the card (REQ-009); a section with nothing left disappears.
  const visible = dismissedIds ? items.filter((item) => !dismissedIds.has(item.item_id)) : items;
  if (visible.length === 0) { return null; }
  return (
    <section className="personalized-search__section" data-item-type={itemType}>
      <h3 className="h4 mb-1">{label}</h3>
      {dek && <p className="text-gray-700 mb-3">{dek}</p>}
      <CardGrid columnSizes={{ xs: 12, lg: 6, xl: 4 }}>
        {visible.map((item) => (
          <EditorialItemCard
            key={item.item_id}
            item={item}
            enterpriseSlug={enterpriseSlug}
            saved={savedIds?.has(item.item_id) ?? false}
            onToggleSave={onToggleSave}
            onDismiss={onDismiss}
          />
        ))}
      </CardGrid>
    </section>
  );
};

export default ItemSectionBlock;
