import type { AssistantTurn, TimingData } from '../stream/types';
import { median, toBenchmarkRows } from './benchmark';

const timing = (overrides: Partial<TimingData> = {}): TimingData => ({
  backend: 'openai',
  model_intent: 'gpt-4.1-mini',
  model_compose: 'gpt-5.4-mini',
  intent_ms: 1000,
  retrieval_ms: 200,
  first_text_ms: 3000,
  first_section_ms: 5000,
  complete_ms: 7000,
  dropped_lines: 0,
  debug: {
    candidates: 20,
    followup_attribute: 'level',
    catalog: 'Test',
    cost_usd: 0.005,
    compose: {
      model: 'gpt-5.4-mini',
      effort: 'low',
      input_tokens: 3000,
      cached_input_tokens: 0,
      output_tokens: 600,
      reasoning_tokens: 100,
      elapsed_ms: 4000,
      first_token_ms: 1500,
      cost_usd: 0.0045,
    },
  },
  ...overrides,
});

const turn = (status: AssistantTurn['status'], t: TimingData | null, userMessage = 'Lead a team'): AssistantTurn => ({
  localId: Math.random().toString(),
  messageId: null,
  sequence: null,
  userMessage,
  status,
  step: null,
  text: '',
  blocks: [],
  followups: null,
  error: null,
  timing: t,
});

describe('benchmark rows', () => {
  it('maps timing and debug detail, skipping the streaming turn', () => {
    const rows = toBenchmarkRows([turn('done', timing()), turn('error', null), turn('streaming', null)]);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual(expect.objectContaining({
      turn: 1,
      composeModel: 'gpt-5.4-mini',
      composeEffort: 'low',
      firstSectionMs: 5000,
      composeOutputTokens: 600,
      reasoningTokens: 100,
      costUsd: 0.005,
      candidates: 20,
    }));
    expect(rows[1]).toEqual(expect.objectContaining({ status: 'error', completeMs: null, costUsd: null }));
  });

  it('medians ignore missing values', () => {
    const rows = toBenchmarkRows([
      turn('done', timing({ complete_ms: 6000 })), turn('done', timing({ complete_ms: 9000 })),
      turn('done', timing({ complete_ms: 7000 })), turn('error', null),
    ]);
    expect(median(rows, 'completeMs')).toBe(7000);
    expect(median(rows.slice(0, 2), 'completeMs')).toBe(7500);
    expect(median(rows.slice(3), 'completeMs')).toBeNull();
  });
});
