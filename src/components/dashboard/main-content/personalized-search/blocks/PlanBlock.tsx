import { useIntl } from '@edx/frontend-platform/i18n';

import messages from '../ui/messages';
import type { PlanProps } from '../core/stream/types';

export interface PlanBlockProps extends PlanProps {
  /** Titles of the items on this page, by item_id, so each step can name its item. */
  itemTitles: Record<string, string>;
}

const PlanBlock = ({ steps, itemTitles }: PlanBlockProps) => {
  const intl = useIntl();
  return (
    <aside className="personalized-search__plan border-left pl-3">
      <h3 className="h5 mb-2">{intl.formatMessage(messages.planTitle)}</h3>
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
