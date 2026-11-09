import type { ComponentType, ReactNode } from 'react';
import {
  Badge, Button, Card, Stack,
} from '@openedx/paragon';
import { useIntl } from '@edx/frontend-platform/i18n';

import messages from '../messages';
import type { ItemCard } from '../../core/stream/types';

/**
 * How cards link to an item's page. The host supplies both: the learner portal uses its course and
 * program routes and the router's `Link`.
 */
export interface ItemLinks {
  getItemHref: (item: ItemCard) => string;
  LinkComponent: ComponentType<{ to: string; children: ReactNode }>;
}

const useFacts = (item: ItemCard): string[] => {
  const intl = useIntl();
  const {
    level_type: level,
    weeks_to_complete: weeks,
    pacing_type: pacing,
    program_type: programType,
    course_count: courseCount,
  } = item.facts ?? {};
  const facts: Array<string | null | undefined> = [
    programType,
    level,
    weeks ? intl.formatMessage(messages.weeks, { count: weeks }) : null,
    courseCount ? intl.formatMessage(messages.courseCount, { count: courseCount }) : null,
    pacing === 'self_paced' ? intl.formatMessage(messages.selfPaced) : null,
    pacing === 'instructor_paced' ? intl.formatMessage(messages.instructorPaced) : null,
  ];
  return facts.filter((fact): fact is string => !!fact);
};

export interface EditorialItemCardProps {
  item: ItemCard;
  links: ItemLinks;
  /** Save / Not interested (REQ-009); omitted where the card is read-only. */
  saved?: boolean;
  onToggleSave?: (item: ItemCard) => void;
  onDismiss?: (item: ItemCard) => void;
}

/**
 * Recommendation card with the prototype's "Why this fits you" and fit badges. Server-hydrated
 * from the Algolia hit (KD-5); every field renders as text.
 */
const EditorialItemCard = ({
  item, links, saved = false, onToggleSave, onDismiss,
}: EditorialItemCardProps) => {
  const intl = useIntl();
  const facts = useFacts(item);
  const typeBadge = {
    course: null,
    executive_education: intl.formatMessage(messages.executiveEducation),
    program: intl.formatMessage(messages.program),
  }[item.item_type];

  return (
    <Card className="personalized-search__card h-100" data-item-id={item.item_id}>
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
      <Card.Header
        title={<links.LinkComponent to={links.getItemHref(item)}>{item.title}</links.LinkComponent>}
        subtitle={item.partner_name ?? undefined}
      />
      <Card.Section>
        {(typeBadge || facts.length > 0) && (
          <p className="small text-gray-700 mb-2">
            {typeBadge && <Badge variant="dark" className="mr-2">{typeBadge}</Badge>}
            {facts.join(' · ')}
          </p>
        )}
        {item.why && (
          <div className="personalized-search__why">
            <p className="small font-weight-bold mb-1">{intl.formatMessage(messages.whyThisFits)}</p>
            <p className="mb-2">{item.why}</p>
            {item.fit.length > 0 && (
              <Stack direction="horizontal" gap={2} className="flex-wrap">
                {item.fit.map((tag) => <Badge key={tag} variant="light">{tag}</Badge>)}
              </Stack>
            )}
          </div>
        )}
      </Card.Section>
      {(onToggleSave || onDismiss) && (
        <Card.Footer className="justify-content-start">
          {onToggleSave && (
            <Button
              variant={saved ? 'primary' : 'outline-primary'}
              size="sm"
              aria-pressed={saved}
              aria-label={intl.formatMessage(saved ? messages.unsaveItem : messages.saveItem, { title: item.title })}
              onClick={() => onToggleSave(item)}
            >
              {intl.formatMessage(saved ? messages.saved : messages.save)}
            </Button>
          )}
          {onDismiss && (
            <Button
              variant="tertiary"
              size="sm"
              aria-label={intl.formatMessage(messages.notInterestedItem, { title: item.title })}
              onClick={() => onDismiss(item)}
            >
              {intl.formatMessage(messages.notInterested)}
            </Button>
          )}
        </Card.Footer>
      )}
    </Card>
  );
};

export default EditorialItemCard;
