import {
  Alert, Badge, Button, ButtonGroup, Col, Row, Stack,
} from '@openedx/paragon';
import { useIntl } from '@edx/frontend-platform/i18n';

import ChatPane from './chat/ChatPane';
import DebugPanel from './debug/DebugPanel';
import { usePersonalizedSearchController } from './hooks/usePersonalizedSearchController';
import messages from './messages';
import LearningPagePane from './page/LearningPagePane';
import type { ChatTransport } from './services/ChatTransport';
import './styles/index.scss';

export interface PersonalizedSearchTabProps {
  /** Tests inject a transport; the app selects one from PERSONALIZED_SEARCH_TRANSPORT. */
  transport?: ChatTransport;
}

/**
 * Personalized Search (Chat) tab: chat on one side, the AI-composed learning page on the
 * other (KD-1). Below 768 px one pane shows at a time, switched by a Chat/Page toggle (REQ-011).
 */
const PersonalizedSearchTab = ({ transport }: PersonalizedSearchTabProps) => {
  const intl = useIntl();
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
      viewedTurnId={controller.viewedTurnId}
      pageFocusRequest={controller.pageFocusRequest}
      enterpriseSlug={controller.enterpriseSlug ?? ''}
      reducedMotion={reducedMotion}
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

  return (
    <div className="personalized-search py-3" data-layout={isWide ? 'dual' : 'toggle'}>
      {debugPanel}
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
