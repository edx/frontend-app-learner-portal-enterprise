import { useState } from 'react';
import {
  Button, Chip, OverlayTrigger, Popover, Stack,
} from '@openedx/paragon';
import { useIntl } from '@edx/frontend-platform/i18n';

import messages from '../ui/messages';
import type { PageHeaderProps, ProfileProps } from '../core/stream/types';

export interface PageHeaderBlockProps extends PageHeaderProps {
  /** What the AI knows about the learner; when present, "Why these?" opens it (wireframe D2c). */
  profile?: ProfileProps;
}

/**
 * The results headline (h2) and an "About you" line (wireframe D2). "Why these?" opens a read-only
 * Paragon Popover on hover, focus or click with the plain-language basis and the learner's preferences.
 */
const PageHeaderBlock = ({
  title, dek, label, profile,
}: PageHeaderBlockProps) => {
  const intl = useIntl();
  const [showWhy, setShowWhy] = useState(false);
  return (
    <header className="personalized-search__page-header">
      {label && <p className="sr-only">{label}</p>}
      <div className="d-flex align-items-start justify-content-between">
        <h2 className="mb-2 mr-3">{title}</h2>
        {profile && (
          <OverlayTrigger
            // Hover or focus opens it (a click focuses the button, so it stays open); Esc closes it.
            trigger={['hover', 'focus']}
            placement="bottom-end"
            show={showWhy}
            onToggle={setShowWhy}
            overlay={(
              <Popover id="personalized-search-why-these" style={{ maxWidth: 460 }}>
                <Popover.Title as="h3" className="h5">{intl.formatMessage(messages.whyThese)}</Popover.Title>
                <Popover.Content>
                  <p className="mb-2">{profile.summary}</p>
                  <Stack direction="horizontal" gap={2} className="flex-wrap">
                    {profile.chips.map((chip) => <Chip key={chip}>{chip}</Chip>)}
                  </Stack>
                </Popover.Content>
              </Popover>
            )}
          >
            <Button
              variant="link"
              size="inline"
              className="text-nowrap mt-2"
              aria-expanded={showWhy}
              onKeyDown={(event: React.KeyboardEvent) => { if (event.key === 'Escape') { setShowWhy(false); } }}
            >
              {intl.formatMessage(messages.whyThese)}
            </Button>
          </OverlayTrigger>
        )}
      </div>
      {dek && <p className="text-gray-700 mb-0">{dek}</p>}
    </header>
  );
};

export default PageHeaderBlock;
