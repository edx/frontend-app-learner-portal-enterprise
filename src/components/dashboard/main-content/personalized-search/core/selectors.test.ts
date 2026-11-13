import {
  hasPage, previousPageTurnId, selectPageTurn, selectShownTurn,
} from './selectors';
import type { AssistantTurn } from './stream/types';

const turn = (localId: string, blocks: number): AssistantTurn => (
  { localId, blocks: Array.from({ length: blocks }, (_, i) => ({ id: `${localId}-${i}`, block: { type: 'item_section' } })) } as unknown as AssistantTurn
);

describe('selectPageTurn', () => {
  const turns = [turn('t1', 2), turn('t2', 0), turn('t3', 1), turn('t4', 0)];

  it('shows the viewed turn when it has a page', () => {
    expect(selectPageTurn(turns, 't1')?.localId).toBe('t1');
  });

  it('falls back to the latest turn with a page when the viewed turn has none or is unknown', () => {
    expect(selectPageTurn(turns, 't2')?.localId).toBe('t3');
    expect(selectPageTurn(turns, 'missing')?.localId).toBe('t3');
    expect(selectPageTurn(turns, null)?.localId).toBe('t3');
  });

  it('is null when no turn has a page', () => {
    expect(selectPageTurn([turn('a', 0)], null)).toBeNull();
    expect(selectPageTurn([], null)).toBeNull();
  });
});

describe('selectShownTurn', () => {
  const streaming = (step: string | null, blocks = 0) => ({ ...turn('t3', blocks), status: 'streaming', step }) as AssistantTurn;

  it('is the live turn once it is searching, writing or has blocks; until then the previous page', () => {
    const done = turn('t1', 1);
    expect(selectShownTurn([done, streaming('understanding')], null)?.localId).toBe('t1');
    expect(selectShownTurn([done, streaming('searching')], null)?.localId).toBe('t3');
    expect(selectShownTurn([done, streaming(null, 1)], null)?.localId).toBe('t3');
    expect(selectShownTurn([done, streaming('writing')], 't1')?.localId).toBe('t1');
  });
});

describe('previousPageTurnId', () => {
  it('returns the latest earlier turn with a page', () => {
    const turns = [turn('t1', 1), turn('t2', 0), turn('t3', 1)];
    expect(previousPageTurnId(turns, 2)).toBe('t1');
    expect(previousPageTurnId(turns, 0)).toBeNull();
  });
});

describe('hasPage', () => {
  it('ignores turns that only carry a caveat or the profile', () => {
    const only = (...types: string[]) => ({
      localId: 'x', blocks: types.map((type, i) => ({ id: `b${i}`, block: { type } })),
    }) as unknown as AssistantTurn;
    expect(hasPage(only('caveat', 'profile'))).toBe(false);
    expect(hasPage(only('caveat', 'item_section'))).toBe(true);
    expect(hasPage(only())).toBe(false);
  });
});
