import { create } from 'zustand';

import type { DebugConfig } from '../services/debugConfig';
import { getInitialChatStreamState } from '../stream/applyPart';
import type { ChatStreamState } from '../stream/types';

/** Debug panel choices (`?debug=true`). null model/effort means "use the server default". */
export interface DebugSettings {
  /** Live AI from enterprise-access; off replays the canned fixture turns. */
  live: boolean;
  intentModel: string | null;
  intentEffort: string | null;
  composeModel: string | null;
  composeEffort: string | null;
}

export const DEBUG_SETTINGS_STORAGE_KEY = 'personalizedSearch.debugSettings';

const defaultDebugSettings = (): DebugSettings => ({
  live: true, intentModel: null, intentEffort: null, composeModel: null, composeEffort: null,
});

/** Per-browser convenience only; any storage failure falls back to the defaults. */
export const loadDebugSettings = (): DebugSettings => {
  try {
    const raw = window.localStorage.getItem(DEBUG_SETTINGS_STORAGE_KEY);
    return raw ? { ...defaultDebugSettings(), ...JSON.parse(raw) } : defaultDebugSettings();
  } catch {
    return defaultDebugSettings();
  }
};

const saveDebugSettings = (settings: DebugSettings) => {
  try {
    window.localStorage.setItem(DEBUG_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Storage blocked (private window, previews): the choice lasts until reload.
  }
};

export type MobilePane = 'chat' | 'page';

export interface PersonalizedSearchState {
  /** Chat turns and session, folded from stream parts by `applyPart`. */
  stream: ChatStreamState;
  /** Turn whose page the page pane shows; null means the latest turn with a page. */
  viewedTurnId: string | null;
  /** Incremented to ask the page pane to take focus ("See your last recommendations"). */
  pageFocusRequest: number;
  /** Composer text; kept in the store so a rejected message can be restored. */
  draft: string;
  /** Set when the backend says the feature is off or the learner has no access (403/404). */
  unavailable: boolean;
  /** Polite live-region text announced when a turn finishes. */
  announcement: string;
  /** Below 768 px one pane shows at a time (REQ-011). */
  mobilePane: MobilePane;
  /**
   * The newest page (turn with an item section) the learner has had on screen. "New picks" shows
   * while a newer page exists and the page pane is hidden; deriving it from this, rather than
   * storing a flag, means a stopped or failed turn that discards its blocks can't leave it stale.
   */
  seenPageTurnId: string | null;
  debugSettings: DebugSettings;
  /** Server model menu: undefined until loaded, null when the server has debug overrides off. */
  debugConfig: DebugConfig | null | undefined;
  debugConfigError: string | null;
}

export interface PersonalizedSearchStore extends PersonalizedSearchState {
  setStream: (update: (stream: ChatStreamState) => ChatStreamState) => void;
  setViewedTurnId: (turnId: string | null) => void;
  requestPageFocus: () => void;
  setDraft: (draft: string) => void;
  setUnavailable: (unavailable: boolean) => void;
  setAnnouncement: (announcement: string) => void;
  setMobilePane: (pane: MobilePane) => void;
  setSeenPageTurnId: (turnId: string | null) => void;
  setDebugSettings: (changes: Partial<DebugSettings>) => void;
  setDebugConfig: (config: DebugConfig | null | undefined, error?: string | null) => void;
  /** Clears the conversation; debug choices and the model menu survive New chat. */
  reset: () => void;
}

export const getInitialPersonalizedSearchState = (): PersonalizedSearchState => ({
  stream: getInitialChatStreamState(),
  viewedTurnId: null,
  pageFocusRequest: 0,
  draft: '',
  unavailable: false,
  announcement: '',
  mobilePane: 'chat',
  seenPageTurnId: null,
  debugSettings: loadDebugSettings(),
  debugConfig: undefined,
  debugConfigError: null,
});

/**
 * Client state for the Personalized Search tab: state and simple setters only (KD-6).
 * Not persisted: the server is the record (sessions are reopened from enterprise-access).
 */
export const usePersonalizedSearchStore = create<PersonalizedSearchStore>()((set) => ({
  ...getInitialPersonalizedSearchState(),
  setStream: (update) => set((state) => ({ stream: update(state.stream) })),
  setViewedTurnId: (viewedTurnId) => set({ viewedTurnId }),
  requestPageFocus: () => set((state) => ({ pageFocusRequest: state.pageFocusRequest + 1 })),
  setDraft: (draft) => set({ draft }),
  setUnavailable: (unavailable) => set({ unavailable }),
  setAnnouncement: (announcement) => set({ announcement }),
  setMobilePane: (mobilePane) => set({ mobilePane }),
  setSeenPageTurnId: (seenPageTurnId) => set({ seenPageTurnId }),
  setDebugSettings: (changes) => set((state) => {
    const debugSettings = { ...state.debugSettings, ...changes };
    saveDebugSettings(debugSettings);
    return { debugSettings };
  }),
  setDebugConfig: (debugConfig, debugConfigError = null) => set({ debugConfig, debugConfigError }),
  reset: () => set((state) => ({
    ...getInitialPersonalizedSearchState(),
    debugSettings: state.debugSettings,
    debugConfig: state.debugConfig,
    debugConfigError: state.debugConfigError,
  })),
}));
