import type { ReactNode } from 'react';
import { Icon, Tab, Tabs } from '@openedx/paragon';
import { AutoAwesome } from '@openedx/paragon/icons';
import { useIntl } from '@edx/frontend-platform/i18n';

import messages from '../messages';

export type ResultsTab = 'for-you' | 'excluded' | 'saved';

export interface ResultsTabsProps {
  activeTab: ResultsTab;
  /** Null until saved items have loaded; the tab then reads "Saved (n)". */
  savedCount: number | null;
  /** How many items the learner excluded; the tab shows only when `showExcluded`, disabled at zero. */
  excludedCount?: number;
  showExcluded?: boolean;
  onSelect: (tab: ResultsTab) => void;
  forYou: ReactNode;
  excluded?: ReactNode;
  saved: ReactNode;
}

/**
 * "For you | Excluded (n) | Saved (n)" tabs over the results (wireframe D2/D2b). The sparkle marks the
 * AI-personalized tab. Excluded appears once the learner has excluded something, disabled when empty.
 */
const ResultsTabs = ({
  activeTab, savedCount, excludedCount = 0, showExcluded = false, onSelect, forYou, excluded, saved,
}: ResultsTabsProps) => {
  const intl = useIntl();
  // A gap-free list: Paragon's Tabs measures tabs by child index, so a `false` slot (Excluded hidden)
  // pushed Saved past the last measured tab and into the hidden overflow menu. It measures only on
  // mount and resize, so the Tabs are keyed by whether Excluded shows: adding the tab re-measures.
  const tabs = [
    <Tab
      key="for-you"
      eventKey="for-you"
      title={(
        <span className="d-inline-flex align-items-center">
          <Icon src={AutoAwesome} size="xs" className="mr-1 text-danger-500" />
          {intl.formatMessage(messages.forYouTab)}
        </span>
      )}
    >
      {forYou}
    </Tab>,
    ...(showExcluded ? [
      <Tab
        key="excluded"
        eventKey="excluded"
        disabled={excludedCount === 0}
        title={intl.formatMessage(messages.excludedTab, { count: excludedCount })}
      >
        {excluded}
      </Tab>,
    ] : []),
    <Tab
      key="saved"
      eventKey="saved"
      title={savedCount === null
        ? intl.formatMessage(messages.saved)
        : intl.formatMessage(messages.savedButton, { count: savedCount })}
    >
      {saved}
    </Tab>,
  ];
  return (
    <Tabs
      key={showExcluded ? 'with-excluded' : 'without-excluded'}
      id="personalized-search-results-tabs"
      activeKey={activeTab}
      onSelect={(key: string | null) => onSelect(key === 'saved' || key === 'excluded' ? key : 'for-you')}
      className="mb-4 personalized-search__results-tabs"
    >
      {tabs}
    </Tabs>
  );
};

export default ResultsTabs;
