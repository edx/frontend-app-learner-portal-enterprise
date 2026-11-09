import {
  applyPart, applyParts, beginTurn, endActiveTurn, getInitialChatStreamState,
} from './applyPart';
import { KNOWN_BLOCK_TYPES } from './types';
import { parseSseText } from './parseSse';
import {
  deepFreeze, GOLDEN_FILES, GoldenFile, readGolden,
} from './testUtils';
import type { ChatStreamState, Part } from './types';

const goldenParts = (file: GoldenFile): Part[] => parseSseText(readGolden(file));

const startedState = (): ChatStreamState => beginTurn(getInitialChatStreamState(), {
  localId: 'local-1', userMessage: 'I want to get better at leading a team',
});

const reduceGolden = (file: GoldenFile) => applyParts(startedState(), goldenParts(file));

describe('applyPart', () => {
  describe.each(GOLDEN_FILES)('golden %s', (file) => {
    it('reduces to the committed snapshot', () => {
      expect(reduceGolden(file)).toMatchSnapshot();
    });

    it('is pure: never mutates a deep-frozen state and returns a new object for each applied part', () => {
      let state = deepFreeze(startedState());
      goldenParts(file).forEach((part) => {
        const next = applyPart(state, part);
        // Block types this client doesn't render are dropped by design, so state is unchanged for them.
        const ignored = part.type === 'data-block' && !KNOWN_BLOCK_TYPES.includes(part.data.type);
        if (part.type !== 'text-start' && part.type !== 'text-end' && !ignored) {
          expect(next).not.toBe(state);
        }
        state = deepFreeze(next);
      });
    });

    it('replays without a client-started turn (history reopen)', () => {
      const replayed = applyParts(getInitialChatStreamState(), goldenParts(file));
      const live = reduceGolden(file);
      expect(replayed.turns).toHaveLength(1);
      expect({ ...replayed.turns[0], localId: null, userMessage: null })
        .toEqual({ ...live.turns[0], localId: null, userMessage: null });
    });
  });

  it('normal turn: streams text, keeps blocks in order, ends done with the final title', () => {
    const state = reduceGolden('normal_turn.sse');
    const [turn] = state.turns;
    expect(turn.status).toBe('done');
    expect(turn.step).toBeNull();
    expect(turn.text).toBe('I put a leadership certificate at the top.');
    // profile isn't registered here, so it's dropped; the decision-guide blocks render in stream order.
    expect(turn.blocks.map((b) => b.block.type)).toEqual(
      ['page_header', 'top_pick', 'compare', 'item_section', 'item_section', 'insight', 'plan'],
    );
    expect(turn.followups?.attribute).toBe('type');
    expect(state.session.title).toBe('Leading a team');
    expect(state.activeTurnId).toBeNull();
  });

  it('off-topic and no-match turns have no page blocks', () => {
    expect(reduceGolden('off_topic_turn.sse').turns[0].blocks).toEqual([]);
    expect(reduceGolden('no_match_turn.sse').turns[0].blocks).toEqual([]);
    expect(reduceGolden('off_topic_turn.sse').turns[0].followups?.attribute).toBe('open');
  });

  it('upserts data-session by id, keeping one session with the later title', () => {
    let state = startedState();
    state = applyPart(state, {
      type: 'data-session', id: 'session', data: { session_uuid: 's1', turn_sequence: 1, title: null },
    });
    state = applyPart(state, {
      type: 'data-session', id: 'session', data: { session_uuid: 's1', turn_sequence: 1, title: 'Leading teams' },
    });
    expect(state.session).toEqual({ sessionUuid: 's1', turnSequence: 1, title: 'Leading teams' });
  });

  it('upserts data-block by id in place', () => {
    const header = (title: string): Part => ({
      type: 'data-block', id: 'blk_1', data: { v: 1, type: 'page_header', props: { title, dek: 'd', label: 'l' } },
    });
    const state = applyParts(startedState(), [header('First'), header('Second')]);
    expect(state.turns[0].blocks).toHaveLength(1);
    expect(state.turns[0].blocks[0].block.props).toEqual({ title: 'Second', dek: 'd', label: 'l' });
  });

  it('error discards partial blocks and records the code', () => {
    const [turn] = reduceGolden('error_turn.sse').turns;
    expect(turn.status).toBe('error');
    expect(turn.error).toBe('model_failed');
    expect(turn.blocks).toEqual([]);
  });

  it('ignores unknown part types and blocks with an unknown version or type', () => {
    const state = startedState();
    const unknownPart = { type: 'data-unknown', id: 'x', data: {} } as unknown as Part;
    const v2Block = { type: 'data-block', id: 'blk_9', data: { v: 2, type: 'page_header', props: {} } } as unknown as Part;
    const carousel = { type: 'data-block', id: 'blk_9', data: { v: 1, type: 'carousel', props: {} } } as unknown as Part;
    expect(applyPart(state, unknownPart)).toBe(state);
    expect(applyPart(state, v2Block)).toBe(state);
    expect(applyPart(state, carousel)).toBe(state);
  });

  it('ignores turn parts when no turn is active', () => {
    const state = getInitialChatStreamState();
    expect(applyPart(state, { type: 'text-delta', id: 'reply', delta: 'x' })).toBe(state);
  });

  it('endActiveTurn marks the turn stopped and discards its blocks', () => {
    const parts = goldenParts('normal_turn.sse');
    const firstSection = parts.findIndex((p) => p.type === 'data-block' && p.data.type === 'item_section');
    const midway = applyParts(startedState(), parts.slice(0, firstSection + 1));
    expect(midway.turns[0].blocks.length).toBeGreaterThan(0);
    const stopped = endActiveTurn(midway, { status: 'stopped' });
    expect(stopped.turns[0]).toEqual(expect.objectContaining({ status: 'stopped', blocks: [], step: null }));
    expect(stopped.activeTurnId).toBeNull();
  });
});
