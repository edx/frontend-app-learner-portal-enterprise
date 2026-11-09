import {
  Badge, Button, Card, Icon,
} from '@openedx/paragon';
import { Bookmark, BookmarkBorder } from '@openedx/paragon/icons';
import { useIntl } from '@edx/frontend-platform/i18n';
import classNames from 'classnames';

import messages from '../messages';
import type { ItemCard } from '../../core/stream/types';
import { accentOf, useMeta, useTypeLabel } from './EditorialItemCard';
import type { ItemLinks } from './EditorialItemCard';

export interface CompactItemCardProps {
  item: ItemCard;
  links: ItemLinks;
  saved?: boolean;
  onToggleSave?: (item: ItemCard) => void;
  isTopPick?: boolean;
}

/** The mini card in "Compare top options": type, title, time and a bookmark only (wireframe D2). */
const CompactItemCard = ({
  item, links, saved = false, onToggleSave, isTopPick = false,
}: CompactItemCardProps) => {
  const intl = useIntl();
  const typeLabel = useTypeLabel(item);
  const { time } = useMeta(item);
  return (
    <Card
      className={classNames(
        'personalized-search__card personalized-search__card--compact h-100',
        `personalized-search__card--${accentOf(item)}`,
      )}
      data-item-id={item.item_id}
    >
      <Card.Section>
        <p className="x-small text-gray-700 mb-1">{typeLabel}</p>
        <p className="h5 mb-2">
          <links.LinkComponent to={links.getItemHref(item)} className="stretched-link">{item.title}</links.LinkComponent>
        </p>
        {time.length > 0 && <p className="x-small mb-1">{time.join(' · ')}</p>}
        {isTopPick && (
          <Badge variant="light" className="text-danger-500">{intl.formatMessage(messages.topPick)}</Badge>
        )}
      </Card.Section>
      {onToggleSave && (
        <div className="personalized-search__card-actions">
          <Button
            variant="light"
            size="sm"
            className="personalized-search__card-action rounded-circle"
            aria-pressed={saved}
            aria-label={intl.formatMessage(saved ? messages.unsaveItem : messages.saveItem, { title: item.title })}
            onClick={() => onToggleSave(item)}
          >
            <Icon src={saved ? Bookmark : BookmarkBorder} size="sm" />
          </Button>
        </div>
      )}
    </Card>
  );
};

export default CompactItemCard;
