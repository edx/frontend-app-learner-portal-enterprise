import { useState } from 'react';
import {
  Alert, Badge, Button, ButtonGroup, Col, Row, Stack, Toast,
} from '@openedx/paragon';
import { Add } from '@openedx/paragon/icons';
import { useIntl } from '@edx/frontend-platform/i18n';

import ChatPane from '../ui/chat/ChatPane';
import DebugPanel from '../ui/debug/DebugPanel';
import HistoryPanel from '../ui/history/HistoryPanel';
import PastSearchBanner from '../ui/history/PastSearchBanner';
import SavedView from '../ui/saved/SavedView';
import ResultsTabs from '../ui/page/ResultsTabs';
import { createPersonalizedSearchController } from './usePersonalizedSearchController';
import { useFitToViewport } from './useFitToViewport';
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
  // The chat panel always ends at the bottom of the window, so the composer is a footer that stays in view.
  const chatPanelRef = useFitToViewport<HTMLDivElement>(controller.isWide);
  const {
    isWide, reducedMotion, mobilePane, feedback, savedIds, dismissedIds,
  } = controller;
  const [savedToast, setSavedToast] = useState(false);
  const toggleSave = (item: Parameters<typeof controller.toggleSave>[0]) => {
    const saving = !savedIds.has(item.item_id);
    controller.toggleSave(item);
    if (saving) { setSavedToast(true); }
  };

  const chat = (
    <ChatPane
      turns={controller.turns}
      openingChips={controller.openingChips}
      busy={controller.busy}
      draft={controller.draft}
      announcement={controller.announcement}
      onDraftChange={controller.setDraft}
      onSend={controller.send}
      onStop={controller.stop}
      onRetry={controller.retry}
      ratings={controller.ratings}
      onRate={controller.rateTurn}
    />
  );
  const forYou = (
    <LearningPagePane
      turns={controller.turns}
      registry={registry}
      viewedTurnId={controller.viewedTurnId}
      pageFocusRequest={controller.pageFocusRequest}
      links={controller.links}
      reducedMotion={reducedMotion || controller.mode === 'past'}
      savedIds={savedIds}
      dismissedIds={dismissedIds}
      onToggleSave={toggleSave}
      onDismiss={controller.dismiss}
      undoItem={feedback.undo}
      onUndo={controller.undoDismiss}
      feedbackError={feedback.error}
      onClearNotice={controller.clearFeedbackNotice}
      onAsk={controller.busy ? undefined : (message: string) => controller.send(message, 'more_like_this')}
      onOpenItem={controller.openItem}
      onExplain={controller.explain}
    />
  );
  const page = (
    <ResultsTabs
      activeTab={controller.savedOpen ? 'saved' : 'for-you'}
      savedCount={controller.feedbackLoaded ? feedback.saved.length : null}
      onSelect={(tab) => (tab === 'saved' ? controller.openSaved() : controller.closeSaved())}
      forYou={forYou}
      saved={(
        <SavedView
          items={feedback.saved}
          links={controller.links}
          onToggleSave={controller.toggleSave}
          onOpen={(item) => controller.openItem(item, 'saved_tab')}
        />
      )}
    />
  );

  const debugPanel = controller.debugEnabled && (
    <DebugPanel
      baseUrl={controller.debugBaseUrl}
      settings={controller.debugSettings}
      config={controller.debugConfig}
      configError={controller.debugConfigError}
      turns={controller.turns}
      onChange={controller.setDebugSettings}
      onCopyResults={controller.copyBenchmark}
    />
  );

  if (controller.unavailable) {
    return (
      <div className="personalized-search py-3">
        {debugPanel}
        <Alert variant="warning" className="mt-3">
          {intl.formatMessage(messages.notAvailable)}
        </Alert>
      </div>
    );
  }

  const toolbar = (
    <Stack direction="horizontal" gap={2} className="justify-content-end mb-2 personalized-search__toolbar">
      <Button variant="tertiary" size="sm" disabled={controller.busy} onClick={controller.openHistory}>
        {intl.formatMessage(messages.history)}
      </Button>
      {controller.turns.length > 0 && (
        <Button
          variant="outline-primary"
          size="sm"
          iconBefore={Add}
          disabled={controller.busy}
          onClick={controller.newChat}
        >
          {intl.formatMessage(messages.newChat)}
        </Button>
      )}
    </Stack>
  );
  const overlays = (
    <HistoryPanel
      history={controller.history}
      busy={controller.busy}
      currentSessionUuid={controller.session.sessionUuid}
      onClose={controller.closeHistory}
      onLoadMore={controller.loadMoreHistory}
      onOpenSession={controller.openSession}
    />
  );
  const savedNotice = (
    <Toast
      show={savedToast}
      onClose={() => setSavedToast(false)}
      action={{
        label: intl.formatMessage(messages.viewSaved),
        onClick: () => {
          setSavedToast(false);
          controller.openSaved();
        },
      }}
    >
      {intl.formatMessage(messages.savedToast)}
    </Toast>
  );

  return (
    <div className="personalized-search py-3" data-layout={isWide ? 'dual' : 'toggle'}>
      {debugPanel}
      {toolbar}
      {overlays}
      {savedNotice}
      {controller.mode === 'past' && controller.pastSessionCreated && (
        <PastSearchBanner created={controller.pastSessionCreated} />
      )}
      {isWide ? (
        <Row className="align-items-start">
          {/* The chat stays in view (sticky, its own scroll) while only the results scroll. */}
          <Col md={5} lg={4} className="personalized-search__chat-col">
            <div ref={chatPanelRef} className="personalized-search__chat-panel">{chat}</div>
          </Col>
          <Col md={7} lg={8} className="personalized-search__page-col">{page}</Col>
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
