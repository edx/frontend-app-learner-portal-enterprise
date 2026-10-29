import { CardGrid } from '@openedx/paragon';

import type { ItemSectionProps } from '../stream/types';
import EditorialItemCard from './EditorialItemCard';

export interface ItemSectionBlockProps extends ItemSectionProps {
  enterpriseSlug: string;
}

const ItemSectionBlock = ({
  label, dek, items, item_type: itemType, enterpriseSlug,
}: ItemSectionBlockProps) => (
  <section className="personalized-search__section" data-item-type={itemType}>
    <h3 className="h4 mb-1">{label}</h3>
    {dek && <p className="text-gray-700 mb-3">{dek}</p>}
    <CardGrid columnSizes={{ xs: 12, lg: 6, xl: 4 }}>
      {items.map((item) => <EditorialItemCard key={item.item_id} item={item} enterpriseSlug={enterpriseSlug} />)}
    </CardGrid>
  </section>
);

export default ItemSectionBlock;
