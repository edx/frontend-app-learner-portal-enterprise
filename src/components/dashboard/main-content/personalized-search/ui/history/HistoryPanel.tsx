import {
  Alert, Button, Sheet, Spinner, Stack,
} from '@openedx/paragon';
import { useIntl } from '@edx/frontend-platform/i18n';

import messages from '../messages';
import type { HistoryState } from '../../core/state';

export interface HistoryPanelProps {
  history: HistoryState;
  busy: boolean;
  onClose: () => void;
  onLoadMore: () => void;
  onOpenSession: (sessionUuid: string) => void;
}

/** The learner's past sessions in this enterprise, newest first, in a Sheet (REQ-010). */
const HistoryPanel = ({
  history, busy, onClose, onLoadMore, onOpenSession,
}: HistoryPanelProps) => {
  const intl = useIntl();
  return (
    <Sheet show={history.open} onClose={onClose} position="right">
      <div className="personalized-search__history p-3" role="dialog" aria-label={intl.formatMessage(messages.historyTitle)}>
        <Stack direction="horizontal" className="justify-content-between mb-3">
          <h2 className="h3 mb-0">{intl.formatMessage(messages.historyTitle)}</h2>
          <Button variant="tertiary" size="sm" onClick={onClose}>{intl.formatMessage(messages.close)}</Button>
        </Stack>
        {history.error && <Alert variant="danger">{intl.formatMessage(messages.historyError)}</Alert>}
        {!history.loading && !history.error && history.items.length === 0 && (
          <p className="text-gray-700">{intl.formatMessage(messages.historyEmpty)}</p>
        )}
        <ul className="list-unstyled mb-3">
          {history.items.map((item) => (
            <li key={item.uuid} className="mb-2">
              <Button
                variant="link"
                className="p-0 text-left"
                disabled={busy}
                onClick={() => onOpenSession(item.uuid)}
              >
                {item.title || item.first_prompt}
              </Button>
              <div className="small text-gray-700">
                {intl.formatDate(item.last_message_at, { dateStyle: 'medium' })}
                {item.item_count > 0 && ` · ${intl.formatMessage(messages.historyPicks, { count: item.item_count })}`}
              </div>
            </li>
          ))}
        </ul>
        {history.loading && <Spinner animation="border" screenReaderText={intl.formatMessage(messages.loading)} />}
        {history.hasMore && !history.loading && (
          <Button variant="outline-primary" size="sm" onClick={onLoadMore}>
            {intl.formatMessage(messages.historyLoadMore)}
          </Button>
        )}
      </div>
    </Sheet>
  );
};

export default HistoryPanel;
