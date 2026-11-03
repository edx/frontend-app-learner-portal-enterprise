import '@testing-library/jest-dom/extend-expect';
import {
  act, render, screen, waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntlProvider } from '@edx/frontend-platform/i18n';
import { logError } from '@edx/frontend-platform/logging';
import { useMediaQuery } from '@openedx/paragon';
import { MemoryRouter } from 'react-router-dom';

import PersonalizedSearchTab from '../PersonalizedSearchTab';
import { TransportError } from '../services/ChatTransport';
import type { ChatTransport, SendTurnOptions, TurnRequest } from '../services/ChatTransport';
import type { FixtureName } from '../services/FixtureChatTransport';
import { FixtureChatTransport } from '../services/FixtureChatTransport';
import { usePersonalizedSearchStore } from '../state/personalizedSearchStore';
import { TURN_IN_PROGRESS_RETRY_MS } from '../workflows';
import { useEnterpriseCustomer } from '../../../../app/data';

jest.mock('@openedx/paragon', () => ({
  ...jest.requireActual('@openedx/paragon'),
  useMediaQuery: jest.fn(),
}));
jest.mock('../../../../app/data', () => ({
  ...jest.requireActual('../../../../app/data'),
  useEnterpriseCustomer: jest.fn(),
}));

type Step = { fixture: FixtureName; delayMs?: number } | { error: Error };

/** Plays one scripted step per send: replay a golden, or throw before streaming. */
class ScriptedTransport implements ChatTransport {
  readonly requests: TurnRequest[] = [];

  readonly signals: AbortSignal[] = [];

  constructor(private readonly steps: Step[]) {}

  async* send({ request, signal }: SendTurnOptions) {
    this.requests.push(request);
    if (signal) { this.signals.push(signal); }
    const step = this.steps.shift() ?? { fixture: 'normal_turn.sse' as FixtureName };
    if ('error' in step) { throw step.error; }
    const { fixture, delayMs = 0 } = step;
    const replay = new FixtureChatTransport({ partDelayMs: delayMs, pickFixture: () => fixture });
    yield* replay.send({ request, signal });
  }
}

const renderTab = (transport: ChatTransport) => render(
  <IntlProvider locale="en">
    <MemoryRouter>
      <PersonalizedSearchTab transport={transport} />
    </MemoryRouter>
  </IntlProvider>,
);

const store = () => usePersonalizedSearchStore.getState();
const composer = () => screen.getByRole('textbox', { name: 'Message' });
const waitForIdle = () => waitFor(() => expect(store().stream.activeTurnId).toBeNull());

const sendMessage = async (user: ReturnType<typeof userEvent.setup>, text: string) => {
  await user.type(composer(), text);
  await user.click(screen.getByRole('button', { name: 'Send' }));
};

const GENERIC = 'Something went wrong building your page. Try again.';
const NOT_AVAILABLE = "Personalized Search isn't available right now";

describe('ChatPane stop, errors and retry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    store().reset();
    (useEnterpriseCustomer as jest.Mock).mockReturnValue({ data: { uuid: 'ent-uuid', slug: 'test-enterprise' } });
    (useMediaQuery as jest.Mock).mockReturnValue(true);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('Stop aborts the turn, marks it Stopped, discards its blocks and shows the previous page', async () => {
    const user = userEvent.setup();
    const transport = new ScriptedTransport([
      { fixture: 'normal_turn.sse' },
      { fixture: 'normal_turn.sse', delayMs: 20 },
    ]);
    renderTab(transport);
    await sendMessage(user, 'Leading teams');
    await waitForIdle();
    const firstTurnId = store().stream.turns[0].localId;

    await sendMessage(user, 'Something shorter');
    await waitFor(() => expect(
      store().stream.turns[1].blocks.some(({ block }) => block.type === 'item_section'),
    ).toBe(true));
    await user.click(screen.getByRole('button', { name: 'Stop' }));
    await waitForIdle();

    expect(transport.signals[1].aborted).toBe(true);
    expect(screen.getByText('Stopped')).toBeInTheDocument();
    expect(store().stream.turns[1]).toEqual(expect.objectContaining({ status: 'stopped', blocks: [] }));
    expect(store().viewedTurnId).toBe(firstTurnId);
  });

  it('400 shows the length message and restores the draft', async () => {
    const user = userEvent.setup();
    renderTab(new ScriptedTransport([{ error: new TransportError(400, null) }]));
    await sendMessage(user, 'Too long for the server');
    await waitForIdle();
    expect(screen.getByText('Messages can be up to 500 characters.')).toBeInTheDocument();
    expect(composer()).toHaveValue('Too long for the server');
    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
  });

  it('403 logs and shows the not-available message with no Retry', async () => {
    const user = userEvent.setup();
    renderTab(new ScriptedTransport([{ error: new TransportError(403, null) }]));
    await sendMessage(user, 'Leading teams');
    expect(await screen.findByText(NOT_AVAILABLE)).toBeInTheDocument();
    expect(logError).toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
  });

  it('404 (switch off, or the placeholder transport) shows the not-available Alert with no Retry', async () => {
    const user = userEvent.setup();
    renderTab(new ScriptedTransport([{ error: new TransportError(404, null) }]));
    await sendMessage(user, 'Leading teams');
    expect(await screen.findByText(NOT_AVAILABLE)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
  });

  it('409 keeps the composer disabled, resends once after 2 s, then shows the Alert with Retry', async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const transport = new ScriptedTransport([
      { error: new TransportError(409, 'turn_in_progress') },
      { error: new TransportError(409, 'turn_in_progress') },
    ]);
    renderTab(transport);
    await sendMessage(user, 'Leading teams');

    expect(transport.requests).toHaveLength(1);
    expect(composer()).toBeDisabled();
    await act(async () => { await jest.advanceTimersByTimeAsync(TURN_IN_PROGRESS_RETRY_MS - 100); });
    expect(transport.requests).toHaveLength(1);
    expect(composer()).toBeDisabled();
    await act(async () => { await jest.advanceTimersByTimeAsync(200); });
    expect(transport.requests).toHaveLength(2);
    expect(transport.requests[1]).toEqual(transport.requests[0]);

    expect(screen.getByText('Your previous message is still being answered. Try again in a moment.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('429 shows the slow-down message', async () => {
    const user = userEvent.setup();
    renderTab(new ScriptedTransport([{ error: new TransportError(429, null) }]));
    await sendMessage(user, 'Leading teams');
    expect(await screen.findByText("You're sending messages quickly. Try again in a minute.")).toBeInTheDocument();
  });

  it('503 shows the catalog Alert with Retry', async () => {
    const user = userEvent.setup();
    renderTab(new ScriptedTransport([{ error: new TransportError(503, 'backend_unsupported') }]));
    await sendMessage(user, 'Leading teams');
    expect(await screen.findByText("We couldn't search your catalog right now. Try again.")).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it.each([
    ['an in-stream error', { fixture: 'error_turn.sse' as FixtureName }],
    ['HTTP 401', { error: new TransportError(401, null) }],
    ['HTTP 500', { error: new TransportError(500, null) }],
    ['HTTP 502', { error: new TransportError(502, null) }],
    ['a network failure', { error: new TypeError('Failed to fetch') }],
  ])('%s replaces the pending turn with the generic Alert and Retry, discarding blocks', async (_, step) => {
    const user = userEvent.setup();
    renderTab(new ScriptedTransport([step]));
    await sendMessage(user, 'Leading teams');
    expect(await screen.findByText(GENERIC)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
    expect(store().stream.turns[0].blocks).toEqual([]);
    expect(document.querySelectorAll('[data-block-id]')).toHaveLength(0);
  });

  it('Retry resends the same message on the same session, replacing the failed turn', async () => {
    const user = userEvent.setup();
    const transport = new ScriptedTransport([
      { fixture: 'normal_turn.sse' },
      { error: new TransportError(503, null) },
      { fixture: 'normal_turn.sse' },
    ]);
    renderTab(transport);
    await sendMessage(user, 'Leading teams');
    await waitForIdle();
    const { sessionUuid } = store().stream.session;

    await sendMessage(user, 'Something shorter');
    await user.click(await screen.findByRole('button', { name: 'Retry' }));
    await waitForIdle();

    expect(transport.requests[2]).toEqual(expect.objectContaining({ message: 'Something shorter', sessionUuid }));
    expect(store().stream.turns.map((t) => [t.userMessage, t.status])).toEqual([
      ['Leading teams', 'done'],
      ['Something shorter', 'done'],
    ]);
  });
});
