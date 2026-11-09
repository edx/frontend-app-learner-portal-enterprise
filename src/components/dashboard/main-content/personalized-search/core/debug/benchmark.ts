import type { AssistantTurn } from '../stream/types';

/** One row of the debug benchmark table: a finished or failed turn's timing and cost. */
export interface BenchmarkRow {
  turn: number;
  message: string;
  status: AssistantTurn['status'];
  backend: string | null;
  intentModel: string | null;
  composeModel: string | null;
  composeEffort: string | null;
  intentMs: number | null;
  retrievalMs: number | null;
  firstTextMs: number | null;
  firstSectionMs: number | null;
  completeMs: number | null;
  composeOutputTokens: number | null;
  reasoningTokens: number | null;
  costUsd: number | null;
  /** The response cache per call: 'hit', 'miss', or null when the server sent nothing. */
  intentCache: string | null;
  composeCache: string | null;
  savedInputTokens: number | null;
  savedOutputTokens: number | null;
  candidates: number | null;
  droppedLines: number | null;
}

export const NUMERIC_COLUMNS = [
  'intentMs', 'retrievalMs', 'firstTextMs', 'firstSectionMs', 'completeMs', 'composeOutputTokens', 'costUsd',
  'savedOutputTokens',
] as const;

export type NumericColumn = typeof NUMERIC_COLUMNS[number];

export const toBenchmarkRows = (turns: AssistantTurn[]): BenchmarkRow[] => turns
  .filter((turn) => turn.status !== 'streaming')
  .map((turn, index) => {
    const { timing } = turn;
    const debug = timing?.debug;
    return {
      turn: index + 1,
      message: turn.userMessage ?? '',
      status: turn.status,
      backend: timing?.backend ?? null,
      intentModel: timing?.model_intent ?? null,
      composeModel: timing?.model_compose ?? null,
      composeEffort: debug?.compose?.effort ?? null,
      intentMs: timing?.intent_ms ?? null,
      retrievalMs: timing?.retrieval_ms ?? null,
      firstTextMs: timing?.first_text_ms ?? null,
      firstSectionMs: timing?.first_section_ms ?? null,
      completeMs: timing?.complete_ms ?? null,
      composeOutputTokens: debug?.compose?.output_tokens ?? null,
      reasoningTokens: debug?.compose?.reasoning_tokens ?? null,
      costUsd: debug?.cost_usd ?? null,
      intentCache: debug?.intent?.cache ?? null,
      composeCache: debug?.compose?.cache ?? null,
      savedInputTokens: debug?.tokens_saved?.input_tokens ?? null,
      savedOutputTokens: debug?.tokens_saved?.output_tokens ?? null,
      candidates: debug?.candidates ?? null,
      droppedLines: timing?.dropped_lines ?? null,
    };
  });

/** Median of a column over rows that have a value; null when none do. */
export const median = (rows: BenchmarkRow[], column: NumericColumn): number | null => {
  const values = rows.map((row) => row[column]).filter((v): v is number => typeof v === 'number').sort((a, b) => a - b);
  if (!values.length) { return null; }
  const mid = Math.floor(values.length / 2);
  return values.length % 2 ? values[mid] : (values[mid - 1] + values[mid]) / 2;
};
