/** State shapes shared by the store and the UI. */
import type { SessionSummary } from './api/sessions';

/** Debug panel choices (`?debug=true`). null model/effort means "use the server default". */
export interface DebugSettings {
  /** Live AI from enterprise-access; off replays the canned fixture turns. */
  live: boolean;
  intentModel: string | null;
  intentEffort: string | null;
  composeModel: string | null;
  composeEffort: string | null;
}

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
