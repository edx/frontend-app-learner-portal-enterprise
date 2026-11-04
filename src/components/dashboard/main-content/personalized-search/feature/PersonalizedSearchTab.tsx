import { useState } from 'react';
import {
  Alert, breakpoints, Col, Row, Stack, useMediaQuery,
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
 * other (KD-1). Below 768 px, Phase 1 stacks the chat above the page.
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
  const isWide = useMediaQuery({ minWidth: breakpoints.medium.minWidth });
  const reducedMotion = useMediaQuery({ query: '(prefers-reduced-motion: reduce)' });

  if (controller.unavailable) {
    return (
      <Alert variant="warning" className="mt-3">
        {intl.formatMessage(messages.notAvailable)}
      </Alert>
    );
  }

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

  return (
    <div className="personalized-search py-3" data-layout={isWide ? 'dual' : 'stacked'}>
      {isWide ? (
        <Row>
          <Col md={5} className="personalized-search__chat-col">{chat}</Col>
          <Col md={7} className="personalized-search__page-col">{page}</Col>
        </Row>
      ) : (
        <Stack gap={4}>
          {chat}
          {page}
        </Stack>
      )}
    </div>
  );
};

export default PersonalizedSearchTab;
