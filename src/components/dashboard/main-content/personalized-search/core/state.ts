/** State shapes shared by the store and the UI. */
import type { SessionSummary } from './api/sessions';

/** History sheet state (REQ-010). */
export interface HistoryState {
  open: boolean;
  items: SessionSummary[];
  /** Last page loaded; 0 before the first load. */
  page: number;
  hasMore: boolean;
  loading: boolean;
  error: boolean;
}
