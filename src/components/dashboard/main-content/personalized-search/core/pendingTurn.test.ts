import { beginTurn, getInitialChatStreamState } from './stream/applyPart';
import type { ChatStreamState } from './stream/types';
import {
  INTERRUPTED_TURN_ERROR, clearPendingTurn, loadPendingTurn, savePendingTurn, withInterruptedTurn,
} from './pendingTurn';
import type { PendingTurnStorage } from './pendingTurn';

const memoryStorage = (): PendingTurnStorage => {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, value); },
    removeItem: (key) => { values.delete(key); },
  };
};

/** A reopened session with `stored` turns. */
const reopened = (stored: number): ChatStreamState => {
  let state = getInitialChatStreamState();
  for (let sequence = 1; sequence <= stored; sequence += 1) {
    state = beginTurn(state, { localId: `past-${sequence}`, userMessage: `m${sequence}` });
  }
  return {
    ...state, activeTurnId: null, session: { sessionUuid: 's-1', title: null, turnSequence: stored || null },
  };
};

describe('pending turn storage', () => {
  it('keeps one message per session until cleared', () => {
    const storage = memoryStorage();
    savePendingTurn(storage, 's-1', { message: 'Leading teams', sequence: 2 });
    savePendingTurn(storage, 's-2', { message: 'Other', sequence: 1 });
    expect(loadPendingTurn(storage, 's-1')).toEqual({ message: 'Leading teams', sequence: 2 });
    clearPendingTurn(storage, 's-1');
    expect(loadPendingTurn(storage, 's-1')).toBeNull();
    expect(loadPendingTurn(storage, 's-2')).toEqual({ message: 'Other', sequence: 1 });
  });

  it.each([
    ['not JSON', '{'],
    ['no message', '{"sequence":1}'],
    ['an empty message', '{"message":"","sequence":1}'],
    ['no sequence', '{"message":"m"}'],
  ])('ignores a stored value with %s', (_, raw) => {
    const storage = memoryStorage();
    storage.setItem('personalized-search:pending-turn:s-1', raw);
    expect(loadPendingTurn(storage, 's-1')).toBeNull();
  });

  it('fails quietly when storage is missing or throws', () => {
    const throwing: PendingTurnStorage = {
      getItem: () => { throw new Error('blocked'); },
      setItem: () => { throw new Error('full'); },
      removeItem: () => { throw new Error('blocked'); },
    };
    expect(() => savePendingTurn(throwing, 's-1', { message: 'm', sequence: 1 })).not.toThrow();
    expect(() => clearPendingTurn(throwing, 's-1')).not.toThrow();
    expect(loadPendingTurn(throwing, 's-1')).toBeNull();
    expect(loadPendingTurn(null, 's-1')).toBeNull();
  });
});

describe('withInterruptedTurn', () => {
  it('adds the unfinished message as the last turn, ended as interrupted, when the server did not store it', () => {
    const stream = withInterruptedTurn(reopened(1), { message: 'Something shorter', sequence: 2 });
    expect(stream.turns).toHaveLength(2);
    expect(stream.turns[1]).toEqual(expect.objectContaining({
      localId: 'pending-s-1-2', userMessage: 'Something shorter', status: 'error', error: INTERRUPTED_TURN_ERROR,
    }));
    expect(stream.activeTurnId).toBeNull();
  });

  it('shows the first message of a session the server stored with no turns', () => {
    const stream = withInterruptedTurn(reopened(0), { message: 'Leading teams', sequence: 1 });
    expect(stream.turns.map((t) => t.userMessage)).toEqual(['Leading teams']);
  });

  it('leaves the session unchanged when the turn was stored after all, or nothing is pending', () => {
    const stream = reopened(2);
    expect(withInterruptedTurn(stream, { message: 'm2', sequence: 2 })).toBe(stream);
    expect(withInterruptedTurn(stream, null)).toBe(stream);
  });
});
