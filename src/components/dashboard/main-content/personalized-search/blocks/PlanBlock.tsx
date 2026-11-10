import { useState } from 'react';
import {
  Icon, IconButton, OverlayTrigger, Popover,
} from '@openedx/paragon';
import { InfoOutline } from '@openedx/paragon/icons';
import { useIntl } from '@edx/frontend-platform/i18n';

import messages from '../ui/messages';
import type { PlanProps } from '../core/stream/types';

export interface PlanBlockProps extends PlanProps {
  /** Titles of the items on this page, by item_id, so each step can name its item. */
  itemTitles: Record<string, string>;
  /** Usage event: the learner opened the explanation of the order. */
  onOpenWhy?: () => void;
}

/**
 * "A suggested order": 2-4 of the results as numbered steps. An info button explains how the steps were
 * picked (the rule the server asks for: best fit first, each step building on the last) and, when sent,
 * the AI's one sentence on why this order.
 */
const PlanBlock = ({
  steps, why, itemTitles, onOpenWhy,
}: PlanBlockProps) => {
  const intl = useIntl();
  const [showInfo, setShowInfo] = useState(false);
  return (
    <aside className="personalized-search__plan border-left pl-3">
      <div className="d-flex align-items-center mb-2">
        <h3 className="h5 mb-0">{intl.formatMessage(messages.planTitle)}</h3>
        <OverlayTrigger
          // Hover or focus opens it (a click focuses the button, so it stays open); Esc closes it.
          trigger={['hover', 'focus']}
          placement="bottom-start"
          show={showInfo}
          onToggle={(show: boolean) => {
            if (show && !showInfo) { onOpenWhy?.(); }
            setShowInfo(show);
          }}
          overlay={(
            <Popover id="personalized-search-plan-info" style={{ maxWidth: 360 }}>
              <Popover.Title as="h4" className="h5">{intl.formatMessage(messages.planInfoTitle)}</Popover.Title>
              <Popover.Content>
                <p className={why ? 'mb-2' : 'mb-0'}>{intl.formatMessage(messages.planInfoBody)}</p>
                {why && <p className="mb-0">{why}</p>}
              </Popover.Content>
            </Popover>
          )}
        >
          <IconButton
            src={InfoOutline}
            iconAs={Icon}
            size="inline"
            className="ml-2"
            alt={intl.formatMessage(messages.planInfoTitle)}
            aria-expanded={showInfo}
            onKeyDown={(event: React.KeyboardEvent) => { if (event.key === 'Escape') { setShowInfo(false); } }}
          />
        </OverlayTrigger>
      </div>
      <ol className="pl-3 mb-0">
        {steps.map((step) => (
          <li key={step.item_id} className="mb-1">
            <span className="font-weight-bold">{itemTitles[step.item_id] ?? step.item_id}</span>
            {step.note && <span className="d-block small text-gray-700">{step.note}</span>}
          </li>
        ))}
      </ol>
    </aside>
  );
};

export default PlanBlock;
