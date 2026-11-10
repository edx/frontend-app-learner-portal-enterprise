import type { ComponentType, ReactNode } from 'react';
import classNames from 'classnames';
import {
  Badge, Card, Collapsible, Dropdown, Icon, IconButton,
} from '@openedx/paragon';
import { Bookmark, BookmarkBorder, MoreVert } from '@openedx/paragon/icons';
import { useIntl } from '@edx/frontend-platform/i18n';

import messages from '../messages';
import type { ItemCard } from '../../core/stream/types';

/**
 * How cards link to an item's page. The host supplies both: the learner portal uses its course and
 * program routes and the router's `Link`.
 */
export interface ItemLinks {
  getItemHref: (item: ItemCard) => string;
  /** Optional: the host's full search for a type, for "See all (n)". */
  getSeeAllHref?: (itemType: ItemCard['item_type'], query: string) => string;
  LinkComponent: ComponentType<{ to: string; className?: string; onClick?: () => void; children: ReactNode }>;
}

/** The accent family: certificates, Executive Education, other programs, or courses. */
export const accentOf = (item: ItemCard): string => {
  if (item.item_type === 'program') {
    return /certificate/i.test(item.facts?.program_type ?? '') ? 'certificate' : 'program';
  }
  return item.item_type;
};

/** "Professional Certificate", "Executive Education" or "Course": the header and label always name the type. */
export const useTypeLabel = (item: ItemCard): string => {
  const intl = useIntl();
  if (item.item_type === 'program') {
    return item.facts?.program_type || intl.formatMessage(messages.program);
  }
  return intl.formatMessage(item.item_type === 'executive_education' ? messages.executiveEducation : messages.course);
};

/** Time first (hours per week and length), since time is often the learner's main constraint. */
export const useMeta = (item: ItemCard): { time: string[]; detail: string[] } => {
  const intl = useIntl();
  const {
    hours_per_week_min: minHours,
    hours_per_week_max: maxHours,
    weeks_to_complete: weeks,
    pacing_type: pacing,
    level_type: level,
    course_count: courseCount,
  } = item.facts ?? {};
  let hours: string | null = null;
  if (minHours && maxHours && minHours !== maxHours) {
    hours = intl.formatMessage(messages.hoursRange, { min: minHours, max: maxHours });
  } else if (minHours || maxHours) {
    hours = intl.formatMessage(messages.hours, { count: (minHours || maxHours) as number });
  }
  const time = [
    hours,
    weeks ? intl.formatMessage(messages.weeks, { count: weeks }) : null,
    courseCount ? intl.formatMessage(messages.courseCount, { count: courseCount }) : null,
  ];
  const detail = [
    pacing === 'self_paced' ? intl.formatMessage(messages.selfPaced) : null,
    pacing === 'instructor_paced' ? intl.formatMessage(messages.instructorPaced) : null,
    level || null,
  ];
  const present = (values: Array<string | null>) => values.filter((value): value is string => !!value);
  return { time: present(time), detail: present(detail) };
};

/**
 * Cards per row, the same breakpoints everywhere results show (top pick, compare, groups, Saved): one on
 * phones, two on tablets and three on wide screens, close to the search page's card width.
 */
export const RESULT_COLUMN_SIZES = { xs: 12, md: 6, xl: 4 };

export interface EditorialItemCardProps {
  item: ItemCard;
  links: ItemLinks;
  /** Save / Not for me (REQ-009); omitted where the card is read-only. */
  saved?: boolean;
  onToggleSave?: (item: ItemCard) => void;
  onDismiss?: (item: ItemCard) => void;
  /** Extra content under the meta line, such as a status badge. */
  footer?: ReactNode;
  /** Usage events: the card was opened, or its "Why this?" was expanded. */
  onOpen?: (item: ItemCard) => void;
  onExplain?: (item: ItemCard) => void;
}

/**
 * The edx.org-style result card (wireframe D2): a 4px accent per content type, the image, type label,
 * title, partner, hours per week and length, and one short reason behind "Why this?". Every card has the
 * same parts in the same place (titles clamp to three lines, a missing image keeps its space), so a row
 * of cards lines up like the search page. The whole card is one link; the bookmark and the actions menu
 * sit above it. Server-hydrated (KD-5); every field renders as text.
 */
const EditorialItemCard = ({
  item, links, saved = false, onToggleSave, onDismiss, footer, onOpen, onExplain,
}: EditorialItemCardProps) => {
  const intl = useIntl();
  const typeLabel = useTypeLabel(item);
  const { time, detail } = useMeta(item);
  const hasActions = !!(onToggleSave || onDismiss);

  return (
    <Card
      className={classNames(
        'personalized-search__card h-100',
        `personalized-search__card--${accentOf(item)}`,
        { 'personalized-search__card--updated': item.status === 'new' },
      )}
      data-item-id={item.item_id}
    >
      {item.image_url ? (
        <Card.ImageCap
          src={item.image_url}
          srcAlt=""
          logoSrc={item.partner_logo_url ?? undefined}
          logoAlt={item.partner_name
            ? intl.formatMessage(messages.partnerLogoAlt, { partner: item.partner_name })
            : undefined}
        />
      ) : <div className="personalized-search__card-image-placeholder bg-light-400" aria-hidden />}
      <Card.Section className="personalized-search__card-body d-flex flex-column">
        <p className="x-small text-gray-700 mb-1">{typeLabel}</p>
        <h4 className="h5 mb-1 personalized-search__card-title personalized-search__clamp-3">
          {/* stretched-link makes the whole card one link; the actions sit above it. */}
          <links.LinkComponent to={links.getItemHref(item)} className="stretched-link" onClick={() => onOpen?.(item)}>
            {item.title}
          </links.LinkComponent>
        </h4>
        {item.partner_name && (
          <p className="small text-gray-700 mb-2 personalized-search__clamp-1">{item.partner_name}</p>
        )}
        {time.length > 0 && <p className="x-small mb-0">{time.join(' · ')}</p>}
        {detail.length > 0 && <p className="x-small text-gray-700 mb-0">{detail.join(', ')}</p>}
        {(item.status === 'new' || footer) && (
          <div className="mt-2">
            {item.status === 'new' && (
              <Badge variant="info" className="mr-2">{intl.formatMessage(messages.updated)}</Badge>
            )}
            {footer}
          </div>
        )}
        {item.why && (
          <Collapsible
            styling="basic"
            className="personalized-search__why mt-auto pt-2"
            title={<span className="small">{intl.formatMessage(messages.whyThis)}</span>}
            onToggle={(isOpen: boolean) => { if (isOpen) { onExplain?.(item); } }}
          >
            <p className="small mb-0">{item.why}</p>
          </Collapsible>
        )}
      </Card.Section>
      {hasActions && (
        <div className="personalized-search__card-actions">
          {onToggleSave && (
            <IconButton
              src={saved ? Bookmark : BookmarkBorder}
              iconAs={Icon}
              size="sm"
              className="personalized-search__card-action"
              aria-pressed={saved}
              alt={intl.formatMessage(saved ? messages.unsaveItem : messages.saveItem, { title: item.title })}
              onClick={() => onToggleSave(item)}
            />
          )}
          {onDismiss && (
            <Dropdown>
              <Dropdown.Toggle
                id={`personalized-search-actions-${item.item_id}`}
                as={IconButton}
                src={MoreVert}
                iconAs={Icon}
                size="sm"
                className="personalized-search__card-action"
                alt={intl.formatMessage(messages.moreActions, { title: item.title })}
              />
              {/* Right-aligned under the toggle, so the menu stays over its own card. */}
              <Dropdown.Menu alignRight>
                <Dropdown.Item as="button" onClick={() => onDismiss(item)}>
                  {intl.formatMessage(messages.notForMe)}
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
          )}
        </div>
      )}
    </Card>
  );
};

export default EditorialItemCard;
