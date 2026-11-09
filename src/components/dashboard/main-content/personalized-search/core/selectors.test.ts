import { previousPageTurnId, selectPageTurn } from './selectors';
import type { AssistantTurn } from './stream/types';

const turn = (localId: string, blocks: number): AssistantTurn => (
  { localId, blocks: Array.from({ length: blocks }, (_, i) => ({ id: `${localId}-${i}` })) } as unknown as AssistantTurn
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

describe('previousPageTurnId', () => {
  it('returns the latest earlier turn with a page', () => {
    const turns = [turn('t1', 1), turn('t2', 0), turn('t3', 1)];
    expect(previousPageTurnId(turns, 2)).toBe('t1');
    expect(previousPageTurnId(turns, 0)).toBeNull();
  });
});
