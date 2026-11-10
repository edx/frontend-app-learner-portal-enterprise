import type { ReactNode } from 'react';
import { Icon, Tab, Tabs } from '@openedx/paragon';
import { AutoAwesome } from '@openedx/paragon/icons';
import { useIntl } from '@edx/frontend-platform/i18n';

import messages from '../messages';

export type ResultsTab = 'for-you' | 'saved';

export interface ResultsTabsProps {
  activeTab: ResultsTab;
  /** Null until saved items have loaded; the tab then reads "Saved (n)". */
  savedCount: number | null;
  onSelect: (tab: ResultsTab) => void;
  forYou: ReactNode;
  saved: ReactNode;
}

/** "For you | Saved (n)" tabs over the results (wireframe D2/D2b). The sparkle marks the AI-personalized tab. */
const ResultsTabs = ({
  activeTab, savedCount, onSelect, forYou, saved,
}: ResultsTabsProps) => {
  const intl = useIntl();
  return (
    <Tabs
      id="personalized-search-results-tabs"
      activeKey={activeTab}
      onSelect={(key: string | null) => onSelect(key === 'saved' ? 'saved' : 'for-you')}
      className="mb-4 personalized-search__results-tabs"
    >
      <Tab
        eventKey="for-you"
        title={(
          <span className="d-inline-flex align-items-center">
            <Icon src={AutoAwesome} size="xs" className="mr-1 text-danger-500" />
            {intl.formatMessage(messages.forYouTab)}
          </span>
        )}
      >
        {forYou}
      </Tab>
      <Tab
        eventKey="saved"
        title={savedCount === null
          ? intl.formatMessage(messages.saved)
          : intl.formatMessage(messages.savedButton, { count: savedCount })}
      >
        {saved}
      </Tab>
    </Tabs>
  );
};

export default ResultsTabs;
