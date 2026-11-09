import type { ComponentType, ReactNode } from 'react';
import classNames from 'classnames';
import {
  Button, Card, Collapsible, Dropdown, Icon,
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
  LinkComponent: ComponentType<{ to: string; className?: string; children: ReactNode }>;
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

export interface EditorialItemCardProps {
  item: ItemCard;
  links: ItemLinks;
  /** Save / Not for me (REQ-009); omitted where the card is read-only. */
  saved?: boolean;
  onToggleSave?: (item: ItemCard) => void;
  onDismiss?: (item: ItemCard) => void;
  /** Horizontal when a row has a single card, so the row doesn't look oddly spaced. */
  orientation?: 'vertical' | 'horizontal';
  /** Extra content under the meta line, such as a status badge. */
  footer?: ReactNode;
}

/**
 * The edx.org-style result card (wireframe D2): a 4px accent per content type, the type label, title,
 * partner, hours per week and length, and one short reason behind "Why this?". The whole card is one
 * link; the bookmark and the actions menu sit above it. Server-hydrated (KD-5); every field renders as text.
 */
const EditorialItemCard = ({
  item, links, saved = false, onToggleSave, onDismiss, orientation = 'vertical', footer,
}: EditorialItemCardProps) => {
  const intl = useIntl();
  const typeLabel = useTypeLabel(item);
  const { time, detail } = useMeta(item);
  const hasActions = !!(onToggleSave || onDismiss);

  return (
    <Card
      orientation={orientation}
      className={classNames(
        'personalized-search__card h-100',
        `personalized-search__card--${accentOf(item)}`,
        `personalized-search__card--${orientation}`,
      )}
      data-item-id={item.item_id}
    >
      {item.image_url && (
        <Card.ImageCap
          src={item.image_url}
          srcAlt=""
          logoSrc={item.partner_logo_url ?? undefined}
          logoAlt={item.partner_name
            ? intl.formatMessage(messages.partnerLogoAlt, { partner: item.partner_name })
            : undefined}
        />
      )}
      <Card.Section className="personalized-search__card-body">
        <p className="x-small text-gray-700 mb-1">{typeLabel}</p>
        <h4 className="h5 mb-1 personalized-search__card-title">
          {/* stretched-link makes the whole card one link; the actions sit above it. */}
          <links.LinkComponent to={links.getItemHref(item)} className="stretched-link">
            {item.title}
          </links.LinkComponent>
        </h4>
        {item.partner_name && <p className="small text-gray-700 mb-2">{item.partner_name}</p>}
        {time.length > 0 && <p className="x-small mb-0">{time.join(' · ')}</p>}
        {detail.length > 0 && <p className="x-small text-gray-700 mb-0">{detail.join(', ')}</p>}
        {footer}
        {item.why && (
          <Collapsible
            styling="basic"
            className="personalized-search__why mt-2"
            title={<span className="small">{intl.formatMessage(messages.whyThis)}</span>}
          >
            <p className="small mb-0">{item.why}</p>
          </Collapsible>
        )}
      </Card.Section>
      {hasActions && (
        <div className="personalized-search__card-actions">
          {onToggleSave && (
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
          )}
          {onDismiss && (
            <Dropdown>
              <Dropdown.Toggle
                id={`personalized-search-actions-${item.item_id}`}
                as={Button}
                variant="light"
                size="sm"
                className="personalized-search__card-action rounded-circle"
                aria-label={intl.formatMessage(messages.moreActions, { title: item.title })}
              >
                <Icon src={MoreVert} size="sm" />
              </Dropdown.Toggle>
              <Dropdown.Menu>
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
