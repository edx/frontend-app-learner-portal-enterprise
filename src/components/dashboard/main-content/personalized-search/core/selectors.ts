/**
 * Pure selectors over chat state, shared by the controller and the UI (no React, no host).
 */
import type { AssistantTurn } from './stream/types';

/** Longest message the turn endpoint accepts. */
export const MAX_MESSAGE_LENGTH = 500;

export const isSendableMessage = (draft: string) => {
  const message = draft.trim();
  return message.length > 0 && message.length <= MAX_MESSAGE_LENGTH;
};

/** Latest turn before `index` that has a page. */
export const previousPageTurnId = (turns: AssistantTurn[], index: number): string | null => {
  for (let i = index - 1; i >= 0; i -= 1) {
    if (turns[i].blocks.length > 0) { return turns[i].localId; }
  }
  return null;
};
