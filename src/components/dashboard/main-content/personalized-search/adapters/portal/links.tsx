import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { getLinkToCourse } from '../../../../../course/data/utils';
import type { ItemCard } from '../../core/stream/types';
import type { ItemLinks } from '../../ui/cards/EditorialItemCard';

/** Learner portal route for an item: its course page (with the exec-ed path) or its program page. */
export const getPortalItemHref = (item: ItemCard, enterpriseSlug: string): string => {
  if (item.link.kind === 'program') {
    return `/${enterpriseSlug}/program/${item.link.program_uuid}`;
  }
  return getLinkToCourse({ key: item.link.course_key, courseType: item.link.course_type }, enterpriseSlug);
};

const PortalLink = ({
  to, className, onClick, children,
}: { to: string; className?: string; onClick?: () => void; children: ReactNode }) => (
  <Link to={to} className={className} onClick={onClick}>{children}</Link>
);

/** Item links for the learner portal: its routes, through the router's `Link`. */
export const createPortalItemLinks = (enterpriseSlug: string): ItemLinks => ({
  getItemHref: (item) => getPortalItemHref(item, enterpriseSlug),
  LinkComponent: PortalLink,
  getSeeAllHref: (itemType, query) => {
    const contentType = itemType === 'program' ? 'program' : 'course';
    return `/${enterpriseSlug}/search?q=${encodeURIComponent(query)}&content_type=${contentType}`;
  },
});
