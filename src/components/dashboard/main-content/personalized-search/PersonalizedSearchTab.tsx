import {
  Alert, breakpoints, Col, Row, Stack, useMediaQuery,
} from '@openedx/paragon';
import { useIntl } from '@edx/frontend-platform/i18n';

import ChatPane from './chat/ChatPane';
import { usePersonalizedSearchController } from './hooks/usePersonalizedSearchController';
import messages from './messages';
import LearningPagePane from './page/LearningPagePane';
import './styles/index.scss';

/**
 * Personalized Search (Chat) tab: chat on one side, the AI-composed learning page on the
 * other (KD-1). Below 768 px, Phase 1 stacks the chat above the page.
 */
const PersonalizedSearchTab = () => {
  const intl = useIntl();
  const controller = usePersonalizedSearchController();
  const isWide = useMediaQuery({ minWidth: breakpoints.medium.minWidth });

  if (controller.unavailable) {
    return (
      <Alert variant="warning" className="mt-3">
        {intl.formatMessage(messages.notAvailable)}
      </Alert>
    );
  }

  const chat = <ChatPane openingChips={controller.openingChips} />;
  const page = <LearningPagePane />;

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
