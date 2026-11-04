import '@testing-library/jest-dom/extend-expect';
import {
  act, render, screen, waitFor, within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntlProvider } from '@edx/frontend-platform/i18n';
import { useMediaQuery } from '@openedx/paragon';

import PersonalizedSearchTab from '../../adapters/portal/PortalPersonalizedSearchTab';
import { FixtureChatTransport } from '../../core/transports/FixtureChatTransport';
import type { FixtureName } from '../../core/transports/FixtureChatTransport';
import { createPersonalizedSearchStore } from '../../feature/personalizedSearchStore';
import { useEnterpriseCustomer } from '../../../../../app/data';

const testStore = createPersonalizedSearchStore();

jest.mock('@openedx/paragon', () => ({
  ...jest.requireActual('@openedx/paragon'),
  useMediaQuery: jest.fn(),
}));
jest.mock('../../../../../app/data', () => ({
  ...jest.requireActual('../../../../../app/data'),
  useEnterpriseCustomer: jest.fn(),
}));

const NORMAL_REPLY = 'I built you a page on leading a team: two courses to start and a certificate if you want to go further.';

/** A fixture transport that replays the given goldens in order, one per sent message. */
const scriptedTransport = (fixtures: FixtureName[], partDelayMs = 0) => {
  const queue = [...fixtures];
  const sent: string[] = [];
  const transport = new FixtureChatTransport({
    partDelayMs,
    pickFixture: (message) => {
      sent.push(message);
      return queue.shift() ?? 'normal_turn.sse';
    },
  });
  return { transport, sent };
};

const renderTab = (transport: FixtureChatTransport) => render(
  <IntlProvider locale="en">
    <PersonalizedSearchTab store={testStore} transport={transport} />
  </IntlProvider>,
);

const composer = () => screen.getByRole('textbox', { name: 'Message' });
const sendButton = () => screen.getByRole('button', { name: 'Send' });
const waitForIdle = () => waitFor(() => expect(testStore.getState().stream.activeTurnId).toBeNull());

describe('ChatPane', () => {
  beforeEach(() => {
    testStore.getState().reset();
    (useEnterpriseCustomer as jest.Mock).mockReturnValue({ data: { uuid: 'ent-uuid', slug: 'test-enterprise' } });
    (useMediaQuery as jest.Mock).mockReturnValue(true);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('streams the reply progressively with the status line, and disables the composer until finish', async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const { transport } = scriptedTransport(['normal_turn.sse'], 50);
    renderTab(transport);

    await user.type(composer(), 'Learn AI for my job');
    await user.click(sendButton());

    const chat = screen.getByRole('region', { name: 'Chat' });
    expect(within(chat).getByText('Learn AI for my job')).toBeInTheDocument();
    expect(composer()).toBeDisabled();

    const seenSteps: string[] = [];
    const seenReplyLengths: number[] = [];
    for (let i = 0; i < 25; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await act(async () => { await jest.advanceTimersByTimeAsync(50); });
      const step = document.querySelector('.personalized-search__status')?.getAttribute('data-step');
      if (step && seenSteps[seenSteps.length - 1] !== step) { seenSteps.push(step); }
      const reply = document.querySelector('.personalized-search__reply')?.textContent ?? '';
      if (reply && seenReplyLengths[seenReplyLengths.length - 1] !== reply.length) {
        seenReplyLengths.push(reply.length);
      }
      if (i < 15) { expect(composer()).toBeDisabled(); }
    }

    expect(seenSteps).toEqual(['understanding', 'searching', 'writing']);
    expect(seenReplyLengths.length).toBeGreaterThan(1);
    expect(screen.getByText(NORMAL_REPLY)).toBeInTheDocument();
    expect(composer()).not.toBeDisabled();
  });

  it('sends an opening chip, then a follow-up suggestion chip', async () => {
    const user = userEvent.setup();
    const { transport, sent } = scriptedTransport(['normal_turn.sse', 'normal_turn.sse']);
    renderTab(transport);

    await user.click(screen.getByText('Build data skills'));
    await waitForIdle();
    expect(sent).toEqual(['Build data skills']);

    await user.click(await screen.findByText('Advanced'));
    await waitForIdle();
    expect(sent).toEqual(['Build data skills', 'Advanced']);
  });

  it('chips are keyboard operable', async () => {
    const user = userEvent.setup();
    const { transport, sent } = scriptedTransport(['normal_turn.sse']);
    renderTab(transport);

    (screen.getByText('Learn AI for my job').closest('[role="button"]') as HTMLElement).focus();
    await user.keyboard('{Enter}');
    await waitForIdle();
    expect(sent).toEqual(['Learn AI for my job']);
  });

  it('"View page" on an earlier turn sets viewedTurnId to that turn', async () => {
    const user = userEvent.setup();
    const { transport } = scriptedTransport(['normal_turn.sse', 'normal_turn.sse']);
    renderTab(transport);

    await user.click(screen.getByText('Build data skills'));
    await waitForIdle();
    await user.click(screen.getByText('Advanced'));
    await waitForIdle();

    const [first] = testStore.getState().stream.turns;
    await user.click(screen.getAllByRole('button', { name: 'View page' })[0]);
    expect(testStore.getState().viewedTurnId).toBe(first.localId);
  });

  it('a text-only turn links back to the last recommendations and asks the page pane for focus', async () => {
    const user = userEvent.setup();
    const { transport } = scriptedTransport(['normal_turn.sse', 'no_match_turn.sse']);
    renderTab(transport);

    await user.click(screen.getByText('Build data skills'));
    await waitForIdle();
    await user.type(composer(), 'Underwater basket weaving');
    await user.click(sendButton());
    await waitForIdle();

    const [first] = testStore.getState().stream.turns;
    const focusBefore = testStore.getState().pageFocusRequest;
    await user.click(screen.getByRole('button', { name: 'See your last recommendations' }));
    expect(testStore.getState().viewedTurnId).toBe(first.localId);
    expect(testStore.getState().pageFocusRequest).toBe(focusBefore + 1);
  });

  it('disables Send for an empty or over-long message and keeps the draft', async () => {
    const user = userEvent.setup();
    const { transport, sent } = scriptedTransport([]);
    renderTab(transport);

    expect(sendButton()).toBeDisabled();
    await user.type(composer(), '   ');
    expect(sendButton()).toBeDisabled();

    const longMessage = 'a'.repeat(501);
    await user.clear(composer());
    await user.click(composer());
    await user.paste(longMessage);
    expect(sendButton()).toBeDisabled();
    expect(screen.getByText('Messages can be up to 500 characters.')).toBeInTheDocument();
    await user.keyboard('{Enter}');
    expect(composer()).toHaveValue(longMessage);
    expect(sent).toEqual([]);
  });

  it('New chat resets to the opening state with no session', async () => {
    const user = userEvent.setup();
    const { transport } = scriptedTransport(['normal_turn.sse']);
    renderTab(transport);

    await user.click(screen.getByText('Build data skills'));
    await waitForIdle();
    expect(testStore.getState().stream.session.sessionUuid).not.toBeNull();

    await user.click(screen.getByRole('button', { name: 'New chat' }));
    expect(testStore.getState().stream.session.sessionUuid).toBeNull();
    expect(testStore.getState().stream.turns).toEqual([]);
    expect(screen.getByText('Hi! What do you want to learn?')).toBeInTheDocument();
  });

  it('announces the finished turn once in a polite live region and returns focus to the composer', async () => {
    const user = userEvent.setup();
    const { transport } = scriptedTransport(['normal_turn.sse']);
    const { container } = renderTab(transport);

    await user.click(screen.getByText('Build data skills'));
    await waitForIdle();

    const liveRegions = container.querySelectorAll('[aria-live="polite"]');
    expect(liveRegions).toHaveLength(1);
    expect(liveRegions[0]).toHaveTextContent('New reply, 4 picks on your learning page');
    await waitFor(() => expect(composer()).toHaveFocus());
  });
});
