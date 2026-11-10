import {
  BLOCK_CATALOG_VERSION,
  KNOWN_BLOCK_TYPES,
} from './types';
import type {
  AssistantTurn,
  Block,
  ChatStreamState,
  Part,
  TurnStatus,
} from './types';

export const getInitialChatStreamState = (): ChatStreamState => ({
  session: { sessionUuid: null, title: null, turnSequence: null },
  turns: [],
  activeTurnId: null,
});

const newTurn = (localId: string, userMessage: string | null): AssistantTurn => ({
  localId,
  messageId: null,
  sequence: null,
  analytics: null,
  userMessage,
  status: 'streaming',
  step: null,
  text: '',
  blocks: [],
  followups: null,
  error: null,
  timing: null,
});

/** Decides which `data-block` parts reach the page. The UI passes its block registry's check. */
export type BlockValidator = (block: unknown) => block is Block;

/** The default validator: Block catalog v1's types only. */
export const isCatalogBlock: BlockValidator = (block: unknown): block is Block => {
  if (!block || typeof block !== 'object') { return false; }
  const { v, type, props } = block as { v?: unknown; type?: unknown; props?: unknown };
  return v === BLOCK_CATALOG_VERSION
    && KNOWN_BLOCK_TYPES.includes(type as Block['type'])
    && !!props && typeof props === 'object';
};

const updateTurn = (
  state: ChatStreamState,
  localId: string,
  update: (turn: AssistantTurn) => AssistantTurn,
): ChatStreamState => ({
  ...state,
  turns: state.turns.map((turn) => (turn.localId === localId ? update(turn) : turn)),
});

/**
 * Starts a client-side turn for a message the learner just sent. Not a protocol part: the
 * workflow calls it before the transport yields anything, so the chat shows the message at once.
 */
export const beginTurn = (
  state: ChatStreamState,
  { localId, userMessage }: { localId: string; userMessage: string | null },
): ChatStreamState => ({
  ...state,
  turns: [...state.turns, newTurn(localId, userMessage)],
  activeTurnId: localId,
});

/**
 * Ends the active turn locally (Stop, or a transport error before/while streaming).
 * Partial blocks are discarded either way (REQ-001, UX-04).
 */
export const endActiveTurn = (
  state: ChatStreamState,
  { status, error = null }: { status: Exclude<TurnStatus, 'streaming' | 'done'>; error?: string | null },
): ChatStreamState => {
  if (!state.activeTurnId) { return state; }
  return {
    ...updateTurn(state, state.activeTurnId, (turn) => ({
      ...turn, status, error, step: null, blocks: [],
    })),
    activeTurnId: null,
  };
};

/** Removes a finished turn (Retry replaces a failed turn with a fresh one). */
export const removeTurn = (state: ChatStreamState, localId: string): ChatStreamState => ({
  ...state,
  turns: state.turns.filter((turn) => turn.localId !== localId),
  activeTurnId: state.activeTurnId === localId ? null : state.activeTurnId,
});

/**
 * Folds one stream part into chat state. Pure: never mutates `state`, and returns `state`
 * itself for parts it ignores (unknown types, unknown block versions, parts with no turn).
 */
export const applyPart = (
  state: ChatStreamState,
  part: Part,
  isRenderableBlock: BlockValidator = isCatalogBlock,
): ChatStreamState => {
  if (part.type === 'start') {
    if (state.activeTurnId) {
      return updateTurn(state, state.activeTurnId, (turn) => ({ ...turn, messageId: part.messageId }));
    }
    // Replaying a stored turn (history): there is no client-started turn, so open one here.
    const opened = beginTurn(state, { localId: part.messageId, userMessage: null });
    return updateTurn(opened, part.messageId, (turn) => ({ ...turn, messageId: part.messageId }));
  }

  if (part.type === 'data-session') {
    const withSession = {
      ...state,
      session: {
        sessionUuid: part.data.session_uuid,
        turnSequence: part.data.turn_sequence,
        // Upsert by id: a later part without a title doesn't erase one already set.
        title: part.data.title ?? state.session.title,
      },
    };
    // The active turn learns its sequence too, so it can be rated later.
    return state.activeTurnId
      ? updateTurn(withSession, state.activeTurnId, (turn) => ({ ...turn, sequence: part.data.turn_sequence }))
      : withSession;
  }

  const { activeTurnId } = state;
  if (!activeTurnId) { return state; }

  switch (part.type) {
    case 'data-status':
      return updateTurn(state, activeTurnId, (turn) => ({ ...turn, step: part.data.step }));
    case 'text-start':
    case 'text-end':
      return state;
    case 'text-delta':
      return updateTurn(state, activeTurnId, (turn) => ({ ...turn, text: turn.text + part.delta }));
    case 'data-block': {
      if (!isRenderableBlock(part.data)) { return state; }
      return updateTurn(state, activeTurnId, (turn) => {
        const index = turn.blocks.findIndex((b) => b.id === part.id);
        const entry = { id: part.id, block: part.data };
        const blocks = index === -1
          ? [...turn.blocks, entry]
          : turn.blocks.map((b, i) => (i === index ? entry : b));
        return { ...turn, blocks };
      });
    }
    case 'data-followups':
      return updateTurn(state, activeTurnId, (turn) => ({ ...turn, followups: part.data }));
    case 'data-timing':
      return updateTurn(state, activeTurnId, (turn) => ({ ...turn, timing: part.data }));
    case 'data-analytics':
      return updateTurn(state, activeTurnId, (turn) => ({ ...turn, analytics: part.data }));
    case 'error':
      return {
        ...updateTurn(state, activeTurnId, (turn) => ({
          ...turn, status: 'error', error: part.errorText, step: null, blocks: [],
        })),
        activeTurnId: null,
      };
    case 'finish':
      return {
        ...updateTurn(state, activeTurnId, (turn) => ({ ...turn, status: 'done', step: null })),
        activeTurnId: null,
      };
    default:
      return state;
  }
};

/** Folds a whole part sequence; used by replay (history) and tests. */
export const applyParts = (
  state: ChatStreamState,
  parts: Iterable<Part>,
  isRenderableBlock: BlockValidator = isCatalogBlock,
): ChatStreamState => {
  let next = state;
  // eslint-disable-next-line no-restricted-syntax
  for (const part of parts) {
    next = applyPart(next, part, isRenderableBlock);
  }
  return next;
};
