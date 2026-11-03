import { create } from 'zustand';

import { getInitialChatStreamState } from '../stream/applyPart';
import type { ChatStreamState } from '../stream/types';

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
}

export interface PersonalizedSearchStore extends PersonalizedSearchState {
  setStream: (update: (stream: ChatStreamState) => ChatStreamState) => void;
  setViewedTurnId: (turnId: string | null) => void;
  requestPageFocus: () => void;
  setDraft: (draft: string) => void;
  setUnavailable: (unavailable: boolean) => void;
  setAnnouncement: (announcement: string) => void;
  reset: () => void;
}

export const getInitialPersonalizedSearchState = (): PersonalizedSearchState => ({
  stream: getInitialChatStreamState(),
  viewedTurnId: null,
  pageFocusRequest: 0,
  draft: '',
  unavailable: false,
  announcement: '',
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
  reset: () => set(getInitialPersonalizedSearchState()),
}));
