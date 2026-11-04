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

/** The newest turn that put item picks on the page, or null ("New picks", REQ-011). */
export const latestPicksTurnId = (turns: AssistantTurn[]): string | null => {
  for (let i = turns.length - 1; i >= 0; i -= 1) {
    if (turns[i].blocks.some(({ block }) => block.type === 'item_section')) { return turns[i].localId; }
  }
  return null;
};

/**
 * The turn whose page is shown: the viewed turn if it has a page, else the latest turn with a
 * page. Off-topic, text-only, stopped and errored turns have no blocks, so the previous page stays.
 */
export const selectPageTurn = (turns: AssistantTurn[], viewedTurnId: string | null): AssistantTurn | null => {
  if (viewedTurnId) {
    const viewed = turns.find((turn) => turn.localId === viewedTurnId);
    if (viewed && viewed.blocks.length > 0) { return viewed; }
  }
  for (let i = turns.length - 1; i >= 0; i -= 1) {
    if (turns[i].blocks.length > 0) { return turns[i]; }
  }
  return null;
};
