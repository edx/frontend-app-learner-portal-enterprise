import { CardGrid } from '@openedx/paragon';

import type { ItemSectionProps } from '../core/stream/types';
import EditorialItemCard from '../ui/cards/EditorialItemCard';
import type { ItemLinks } from '../ui/cards/EditorialItemCard';

export interface ItemSectionBlockProps extends ItemSectionProps {
  links: ItemLinks;
}

const ItemSectionBlock = ({
  label, dek, items, item_type: itemType, links,
}: ItemSectionBlockProps) => (
  <section className="personalized-search__section" data-item-type={itemType}>
    <h3 className="h4 mb-1">{label}</h3>
    {dek && <p className="text-gray-700 mb-3">{dek}</p>}
    <CardGrid columnSizes={{ xs: 12, lg: 6, xl: 4 }}>
      {items.map((item) => <EditorialItemCard key={item.item_id} item={item} links={links} />)}
    </CardGrid>
  </section>
);

export default ItemSectionBlock;
