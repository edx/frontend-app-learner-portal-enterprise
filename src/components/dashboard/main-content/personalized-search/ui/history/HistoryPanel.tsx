import {
  Alert, Button, Icon, IconButton, Sheet, Spinner,
} from '@openedx/paragon';
import { ChatBubbleOutline, Close } from '@openedx/paragon/icons';
import { useIntl } from '@edx/frontend-platform/i18n';
import classNames from 'classnames';

import messages from '../messages';
import type { HistoryState } from '../../core/state';
import type { SessionSummary } from '../../core/api/sessions';

export interface HistoryPanelProps {
  history: HistoryState;
  busy: boolean;
  /** The conversation on screen, marked as current in the list. */
  currentSessionUuid?: string | null;
  onClose: () => void;
  onLoadMore: () => void;
  onOpenSession: (sessionUuid: string) => void;
}

export type HistoryDay = 'today' | 'yesterday' | 'week' | 'older';

const DAY_LABELS = {
  today: messages.historyToday,
  yesterday: messages.historyYesterday,
  week: messages.historyPreviousWeek,
  older: messages.historyOlder,
};

/** Sessions by last activity, newest first: today, yesterday, the previous 7 days, then older. */
export const groupByDay = (
  items: SessionSummary[],
  now: Date = new Date(),
): Array<{ day: HistoryDay; items: SessionSummary[] }> => {
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const dayMs = 24 * 60 * 60 * 1000;
  const dayOf = (item: SessionSummary): HistoryDay => {
    const at = new Date(item.last_message_at).getTime();
    if (at >= startOfToday) { return 'today'; }
    if (at >= startOfToday - dayMs) { return 'yesterday'; }
    if (at >= startOfToday - 7 * dayMs) { return 'week'; }
    return 'older';
  };
  const groups: Array<{ day: HistoryDay; items: SessionSummary[] }> = [];
  items.forEach((item) => {
    const day = dayOf(item);
    const last = groups[groups.length - 1];
    if (last?.day === day) { last.items.push(item); } else { groups.push({ day, items: [item] }); }
  });
  return groups;
};

/**
 * The learner's past sessions in this enterprise (REQ-010), laid out like the Xpert chat sidebar: a
 * right-hand panel with a title bar and an icon close button, conversations under day dividers, and
 * one row per conversation (title, then time and picks). The open conversation is marked current.
 */
const HistoryPanel = ({
  history, busy, currentSessionUuid, onClose, onLoadMore, onOpenSession,
}: HistoryPanelProps) => {
  const intl = useIntl();
  const when = (item: SessionSummary, day: HistoryDay) => (day === 'today' || day === 'yesterday'
    ? intl.formatTime(item.last_message_at, { timeStyle: 'short' })
    : intl.formatDate(item.last_message_at, { dateStyle: 'medium' }));
  return (
    <Sheet show={history.open} onClose={onClose} position="right" className="personalized-search__history-sheet">
      <div
        className="personalized-search__history d-flex flex-column h-100"
        role="dialog"
        aria-label={intl.formatMessage(messages.historyTitle)}
      >
        <div className="personalized-search__history-header d-flex align-items-center justify-content-between">
          <h2 className="h4 mb-0">{intl.formatMessage(messages.historyTitle)}</h2>
          <IconButton src={Close} iconAs={Icon} alt={intl.formatMessage(messages.close)} onClick={onClose} />
        </div>
        <div className="personalized-search__history-list flex-grow-1 py-2">
          {history.error && (
            <Alert variant="danger" className="mx-3">{intl.formatMessage(messages.historyError)}</Alert>
          )}
          {!history.loading && !history.error && history.items.length === 0 && (
            <div className="text-center text-gray-700 px-4 py-5">
              <Icon src={ChatBubbleOutline} className="mx-auto mb-2" />
              <p className="small mb-0">{intl.formatMessage(messages.historyEmpty)}</p>
            </div>
          )}
          {groupByDay(history.items).map(({ day, items }) => (
            <section key={day} aria-label={intl.formatMessage(DAY_LABELS[day])}>
              <p className="personalized-search__history-divider x-small text-gray-700 mt-2 mb-1">
                {intl.formatMessage(DAY_LABELS[day])}
              </p>
              <ul className="list-unstyled mb-0">
                {items.map((item) => {
                  const current = item.uuid === currentSessionUuid;
                  return (
                    <li key={item.uuid}>
                      <button
                        type="button"
                        className={classNames('personalized-search__history-item', {
                          'personalized-search__history-item--current': current,
                        })}
                        aria-current={current || undefined}
                        disabled={busy}
                        onClick={() => onOpenSession(item.uuid)}
                      >
                        <span className="d-block small font-weight-bold personalized-search__clamp-2">
                          {item.title || item.first_prompt}
                        </span>
                        <span className="d-block x-small text-gray-700">
                          {when(item, day)}
                          {item.item_count > 0
                            && ` · ${intl.formatMessage(messages.historyPicks, { count: item.item_count })}`}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
          {history.loading && (
            <div className="text-center py-3">
              <Spinner animation="border" size="sm" screenReaderText={intl.formatMessage(messages.loading)} />
            </div>
          )}
          {history.hasMore && !history.loading && (
            <div className="px-3 py-2">
              <Button variant="tertiary" size="sm" block onClick={onLoadMore}>
                {intl.formatMessage(messages.historyLoadMore)}
              </Button>
            </div>
          )}
        </div>
      </div>
    </Sheet>
  );
};

export default HistoryPanel;
