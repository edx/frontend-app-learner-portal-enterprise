import { CardGrid, Icon } from '@openedx/paragon';
import { BookmarkBorder } from '@openedx/paragon/icons';
import { useIntl } from '@edx/frontend-platform/i18n';

import messages from '../messages';
import EditorialItemCard, { RESULT_COLUMN_SIZES } from '../cards/EditorialItemCard';
import type { ItemLinks } from '../cards/EditorialItemCard';
import type { ItemCard } from '../../core/stream/types';

export interface SavedViewProps {
  items: ItemCard[];
  links: ItemLinks;
  onToggleSave: (item: ItemCard) => void;
  onOpen?: (item: ItemCard) => void;
}

/** The Saved tab: the learner's saved items in this enterprise, from their saved snapshots (REQ-009). */
const SavedView = ({
  items, links, onToggleSave, onOpen,
}: SavedViewProps) => {
  const intl = useIntl();
  if (items.length === 0) {
    return (
      <div className="personalized-search__saved-empty d-flex align-items-start p-4">
        <Icon src={BookmarkBorder} className="mr-3 flex-shrink-0" />
        <p className="mb-0">{intl.formatMessage(messages.savedEmpty)}</p>
      </div>
    );
  }
  return (
    <CardGrid columnSizes={RESULT_COLUMN_SIZES}>
      {items.map((item) => (
        <EditorialItemCard
          key={item.item_id}
          // "Updated" belongs to the results; a saved card is just saved (as after a reload).
          item={{ ...item, status: undefined }}
          links={links}
          saved
          onToggleSave={onToggleSave}
          onOpen={onOpen}
        />
      ))}
    </CardGrid>
  );
};

export default SavedView;
