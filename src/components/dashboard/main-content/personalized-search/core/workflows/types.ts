import type { ChatTransport, TurnRequest } from '../transports/ChatTransport';
import type { BlockValidator } from '../stream/applyPart';
import type { ChatStreamState } from '../stream/types';

export type StreamDispatch = (update: (stream: ChatStreamState) => ChatStreamState) => void;

export interface SendTurnWorkflowInput {
  transport: ChatTransport;
  request: TurnRequest;
  /** Client id for the new turn. */
  localId: string;
  /** Aborting stops the turn (Stop). */
  signal: AbortSignal;
  /** Applies a state update to the store's stream state. */
  dispatch: StreamDispatch;
  /** Which blocks to keep (the UI's block registry); Block catalog v1 by default. */
  isRenderableBlock?: BlockValidator;
}

export type SendTurnWorkflowResult =
  | { outcome: 'done'; itemCount: number }
  | { outcome: 'stopped' }
  | { outcome: 'error'; status: number | null; code: string | null };
