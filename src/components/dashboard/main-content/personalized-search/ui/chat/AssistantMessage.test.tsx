import '@testing-library/jest-dom/extend-expect';
import { render, screen } from '@testing-library/react';
import { IntlProvider } from '@edx/frontend-platform/i18n';

import { applyParts, beginTurn, getInitialChatStreamState } from '../../core/stream/applyPart';
import { parseSseText } from '../../core/stream/parseSse';
import { readGolden } from '../../core/stream/testUtils';
import type { AssistantTurn } from '../../core/stream/types';
import AssistantMessage from './AssistantMessage';
import type { AssistantMessageProps } from './AssistantMessage';

const [DONE] = applyParts(
  beginTurn(getInitialChatStreamState(), { localId: 'turn-1', userMessage: 'm' }),
  parseSseText(readGolden('normal_turn.sse')),
).turns;

const renderMessage = (turn: AssistantTurn, onRate: AssistantMessageProps['onRate']) => render(
  <IntlProvider locale="en">
    <AssistantMessage turn={turn} isLatest busy={false} onRetry={jest.fn()} onRate={onRate} />
  </IntlProvider>,
);

describe('AssistantMessage thumbs', () => {
  it('shows both thumbs, unpressed, on a finished reply the server numbered', () => {
    expect(DONE.sequence).not.toBeNull();
    renderMessage(DONE, jest.fn());
    expect(screen.getByRole('button', { name: 'Helpful' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Not helpful' })).toHaveAttribute('aria-pressed', 'false');
  });

  it.each([
    ['while the reply streams', { ...DONE, status: 'streaming' } as AssistantTurn, jest.fn()],
    ['before the server numbers the turn', { ...DONE, sequence: null }, jest.fn()],
    ['where rating is unavailable', DONE, undefined],
  ])('hides them %s', (_, turn, onRate) => {
    renderMessage(turn, onRate);
    expect(screen.queryByRole('button', { name: 'Helpful' })).not.toBeInTheDocument();
  });
});
