import {
  Button, CardGrid, Sheet, Stack,
} from '@openedx/paragon';
import { useIntl } from '@edx/frontend-platform/i18n';

import messages from '../messages';
import EditorialItemCard from '../page/EditorialItemCard';
import type { ItemCard } from '../stream/types';

export interface SavedViewProps {
  open: boolean;
  items: ItemCard[];
  enterpriseSlug: string;
  onClose: () => void;
  onToggleSave: (item: ItemCard) => void;
}

/** The learner's saved items in this enterprise, from their saved snapshots (REQ-009). */
const SavedView = ({
  open, items, enterpriseSlug, onClose, onToggleSave,
}: SavedViewProps) => {
  const intl = useIntl();
  return (
    <Sheet show={open} onClose={onClose} position="right">
      <div className="personalized-search__saved p-3" role="dialog" aria-label={intl.formatMessage(messages.savedTitle)}>
        <Stack direction="horizontal" className="justify-content-between mb-3">
          <h2 className="h3 mb-0">{intl.formatMessage(messages.savedTitle)}</h2>
          <Button variant="tertiary" size="sm" onClick={onClose}>{intl.formatMessage(messages.close)}</Button>
        </Stack>
        {items.length === 0 ? (
          <p className="text-gray-700">{intl.formatMessage(messages.savedEmpty)}</p>
        ) : (
          <CardGrid columnSizes={{ xs: 12 }}>
            {items.map((item) => (
              <EditorialItemCard
                key={item.item_id}
                item={item}
                enterpriseSlug={enterpriseSlug}
                saved
                onToggleSave={onToggleSave}
              />
            ))}
          </CardGrid>
        )}
      </div>
    </Sheet>
  );
};

export default SavedView;
