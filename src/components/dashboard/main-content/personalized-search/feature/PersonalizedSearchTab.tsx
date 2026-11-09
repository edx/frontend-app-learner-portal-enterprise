import { useState } from 'react';
import {
  Alert, Badge, Button, ButtonGroup, Col, Row, Stack,
} from '@openedx/paragon';
import { useIntl } from '@edx/frontend-platform/i18n';

import ChatPane from '../ui/chat/ChatPane';
import { createPersonalizedSearchController } from './usePersonalizedSearchController';
import { createPersonalizedSearchStore } from './personalizedSearchStore';
import type { PersonalizedSearchStoreApi } from './personalizedSearchStore';
import type { PersonalizedSearchDeps } from './deps';
import { defaultBlockRegistry } from '../blocks/blockRegistry';
import type { BlockRegistry } from '../blocks/blockRegistry';
import messages from '../ui/messages';
import LearningPagePane from '../ui/page/LearningPagePane';
import type { ChatTransport } from '../core/transports/ChatTransport';
import '../ui/styles/index.scss';

export interface PersonalizedSearchTabProps {
  /** Tests inject a transport; the app selects one from PERSONALIZED_SEARCH_TRANSPORT. */
  transport?: ChatTransport;
  /** What the feature needs from its host (the learner portal passes `portalDeps`). */
  deps: PersonalizedSearchDeps;
  /** Tests pass a store to inspect it; otherwise each mounted tab creates its own. */
  store?: PersonalizedSearchStoreApi;
  /** Block renderers for the learning page; Block catalog v1 by default. */
  registry?: BlockRegistry;
}

/**
 * Personalized Search (Chat) tab: chat on one side, the AI-composed learning page on the
 * other (KD-1). Below 768 px one pane shows at a time, switched by a Chat/Page toggle (REQ-011).
 */
const PersonalizedSearchTab = ({
  transport, deps, store, registry = defaultBlockRegistry,
}: PersonalizedSearchTabProps) => {
  const intl = useIntl();
  const [usePersonalizedSearchController] = useState(() => createPersonalizedSearchController({
    deps,
    store: store ?? createPersonalizedSearchStore(),
    isRenderableBlock: registry.isRenderable,
  }));
  const controller = usePersonalizedSearchController({ transport });
  const { isWide, reducedMotion, mobilePane } = controller;

  const chat = (
    <ChatPane
      turns={controller.turns}
      openingChips={controller.openingChips}
      busy={controller.busy}
      draft={controller.draft}
      announcement={controller.announcement}
      onDraftChange={controller.setDraft}
      onSend={controller.send}
      onNewChat={controller.newChat}
      onViewPage={controller.viewPage}
      onShowLastRecommendations={controller.showLastRecommendations}
      onStop={controller.stop}
      onRetry={controller.retry}
    />
  );
  const page = (
    <LearningPagePane
      turns={controller.turns}
      registry={registry}
      viewedTurnId={controller.viewedTurnId}
      pageFocusRequest={controller.pageFocusRequest}
      links={controller.links}
      reducedMotion={reducedMotion}
    />
  );

  if (controller.unavailable) {
    return (
      <div className="personalized-search py-3">
        <Alert variant="warning" className="mt-3">
          {intl.formatMessage(messages.notAvailable)}
        </Alert>
      </div>
    );
  }

  return (
    <div className="personalized-search py-3" data-layout={isWide ? 'dual' : 'toggle'}>
      {isWide ? (
        <Row>
          <Col md={5} className="personalized-search__chat-col">{chat}</Col>
          <Col md={7} className="personalized-search__page-col">{page}</Col>
        </Row>
      ) : (
        <Stack gap={3}>
          <ButtonGroup
            className="personalized-search__pane-toggle"
            aria-label={intl.formatMessage(messages.paneToggle)}
          >
            <Button
              variant={mobilePane === 'chat' ? 'primary' : 'outline-primary'}
              aria-pressed={mobilePane === 'chat'}
              aria-controls="personalized-search-chat-pane"
              onClick={() => controller.showPane('chat')}
            >
              {intl.formatMessage(messages.paneChat)}
            </Button>
            <Button
              variant={mobilePane === 'page' ? 'primary' : 'outline-primary'}
              aria-pressed={mobilePane === 'page'}
              aria-controls="personalized-search-page-pane"
              onClick={() => controller.showPane('page')}
            >
              {intl.formatMessage(messages.panePage)}
              {controller.hasNewPicks && (
                <Badge variant="info" className="ml-2">{intl.formatMessage(messages.newPicks)}</Badge>
              )}
            </Button>
          </ButtonGroup>
          {/* Both panes stay mounted so switching keeps the draft, scroll position and stream. */}
          <div id="personalized-search-chat-pane" hidden={mobilePane !== 'chat'}>{chat}</div>
          <div id="personalized-search-page-pane" hidden={mobilePane !== 'page'}>{page}</div>
        </Stack>
      )}
    </div>
  );
};

export default PersonalizedSearchTab;
