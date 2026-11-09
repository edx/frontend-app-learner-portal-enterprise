import '@testing-library/jest-dom/extend-expect';
import {
  render, screen, waitFor, within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { getAuthenticatedHttpClient } from '@edx/frontend-platform/auth';
import { IntlProvider } from '@edx/frontend-platform/i18n';
import { useMediaQuery } from '@openedx/paragon';
import { MemoryRouter, useLocation } from 'react-router-dom';

import PersonalizedSearchTab from '../../adapters/portal/PortalPersonalizedSearchTab';
import type { ChatTransport, SendTurnOptions, TurnRequest } from '../../core/transports/ChatTransport';
import { FixtureChatTransport } from '../../core/transports/FixtureChatTransport';
import type { SessionDetail } from '../../core/api/sessions';
import { createPersonalizedSearchStore } from '../../feature/personalizedSearchStore';
import { applyParts, getInitialChatStreamState } from '../../core/stream/applyPart';
import { readGolden } from '../../core/stream/testUtils';
import { parseSseText } from '../../core/stream/parseSse';
import type { Part } from '../../core/stream/types';
import { reopenSessionWorkflow } from '../../core/workflows';
import HistoryPanel, { groupByDay } from './HistoryPanel';
import { useEnterpriseCustomer } from '../../../../../app/data';

const testStore = createPersonalizedSearchStore();

jest.mock('@openedx/paragon', () => ({
  ...jest.requireActual('@openedx/paragon'),
  useMediaQuery: jest.fn(),
}));
jest.mock('@edx/frontend-platform/auth', () => ({
  ...jest.requireActual('@edx/frontend-platform/auth'),
  getAuthenticatedHttpClient: jest.fn(),
}));
jest.mock('@edx/frontend-platform/config', () => ({
  ...jest.requireActual('@edx/frontend-platform/config'),
  getConfig: () => ({ PERSONALIZED_SEARCH_API_BASE_URL: 'http://ea.test' }),
}));
jest.mock('../../../../../app/data', () => ({
  ...jest.requireActual('../../../../../app/data'),
  useEnterpriseCustomer: jest.fn(),
}));

/** What the backend stores for replay: transient parts, data-timing and finish dropped; text coalesced. */
const storedParts = (parts: Part[]): Part[] => {
  const out: Part[] = [];
  let reply: { type: 'text-delta'; id: string; delta: string } | null = null;
  parts.forEach((part) => {
    if (('transient' in part && part.transient) || part.type === 'data-timing' || part.type === 'finish') { return; }
    if (part.type === 'text-delta') {
      if (!reply) { reply = { type: 'text-delta', id: part.id, delta: '' }; out.push(reply); }
      reply.delta += part.delta;
      return;
    }
    out.push(part);
  });
  return out;
};

const GOLDEN = parseSseText(readGolden('normal_turn.sse'));
const DETAIL: SessionDetail = {
  uuid: '6f1c2a3e-0b7d-4c5e-9a10-2b3c4d5e6f70',
  title: 'Becoming a team lead',
  created: '2026-10-29T12:00:00Z',
  turns: [{
    sequence: 1, user_message: 'Prepare for a leadership role', parts: storedParts(GOLDEN), created: '2026-10-29T12:00:00Z',
  }],
};

describe('reopenSessionWorkflow', () => {
  it('replays stored parts into the same turn the live stream produced', () => {
    const live = applyParts(getInitialChatStreamState(), GOLDEN).turns[0];
    const state = reopenSessionWorkflow(DETAIL);
    const [past] = state.turns;
    expect(past.status).toBe('done');
    expect(past.userMessage).toBe('Prepare for a leadership role');
    expect(past.text).toBe(live.text);
    expect(past.blocks).toEqual(live.blocks);
    expect(past.followups).toEqual(live.followups);
    expect(state.session).toEqual(expect.objectContaining({ sessionUuid: DETAIL.uuid, title: 'Becoming a team lead' }));
    expect(state.activeTurnId).toBeNull();
  });
});

class RecordingTransport implements ChatTransport {
  readonly requests: TurnRequest[] = [];

  async* send({ request, signal }: SendTurnOptions) {
    this.requests.push(request);
    yield* new FixtureChatTransport({ partDelayMs: 0, pickFixture: () => 'normal_turn.sse' }).send({ request, signal });
  }
}

const SUMMARIES = Array.from({ length: 21 }, (_, i) => ({
  uuid: i === 0 ? DETAIL.uuid : `s-${i}`,
  title: i === 0 ? 'Becoming a team lead' : `Search ${i}`,
  first_prompt: 'p',
  item_count: 3,
  last_message_at: '2026-10-29T12:00:00Z',
  created: '2026-10-29T12:00:00Z',
}));

describe('History panel (chunk 29)', () => {
  const httpGet = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    testStore.getState().reset();
    (useEnterpriseCustomer as jest.Mock).mockReturnValue({ data: { uuid: 'ent-uuid', slug: 'test-enterprise' } });
    (useMediaQuery as jest.Mock).mockImplementation((q: { minWidth?: number }) => q.minWidth !== undefined);
    httpGet.mockImplementation(async (url: string, { params }: { params: { page?: number } }) => {
      if (url.endsWith(`/sessions/${DETAIL.uuid}/`)) { return { data: DETAIL }; }
      const page = params.page ?? 1;
      return { data: { count: 21, next: page === 1 ? 'next' : null, results: page === 1 ? SUMMARIES.slice(0, 20) : SUMMARIES.slice(20) } };
    });
    (getAuthenticatedHttpClient as jest.Mock).mockReturnValue({ get: httpGet });
  });

  const renderTab = (transport: ChatTransport) => render(
    <IntlProvider locale="en">
      <MemoryRouter>
        <PersonalizedSearchTab store={testStore} transport={transport} />
      </MemoryRouter>
    </IntlProvider>,
  );

  it('lists sessions, loads more, reopens one unanimated under a banner, and continues it', async () => {
    const user = userEvent.setup();
    const transport = new RecordingTransport();
    const { container } = renderTab(transport);

    await user.click(screen.getByRole('button', { name: 'History' }));
    const panel = await screen.findByRole('dialog', { name: 'Past searches' });
    await within(panel).findByRole('button', { name: /^Becoming a team lead/ });
    expect(httpGet).toHaveBeenCalledWith(
      'http://ea.test/api/v1/personalized-search/sessions/',
      { params: { enterprise_customer_uuid: 'ent-uuid', page: 1 } },
    );
    expect(within(panel).getAllByRole('button', { name: /^(Becoming|Search)/ })).toHaveLength(20);
    await user.click(within(panel).getByRole('button', { name: 'Load more' }));
    await waitFor(() => expect(within(panel).getAllByRole('button', { name: /^(Becoming|Search)/ })).toHaveLength(21));

    await user.click(within(panel).getByRole('button', { name: /^Becoming a team lead/ }));
    expect(await screen.findByText(/^Past search · Oct 29, 2026/)).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: 'Past searches' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Lead with confidence' })).toBeInTheDocument();
    expect(container.querySelector('.personalized-search__block--enter')).toBeNull(); // no animation

    await user.type(screen.getByRole('textbox', { name: 'Message' }), 'Something shorter');
    await user.click(screen.getByRole('button', { name: 'Send' }));
    await waitFor(() => expect(testStore.getState().stream.activeTurnId).toBeNull());
    expect(transport.requests[0]).toEqual(expect.objectContaining({ sessionUuid: DETAIL.uuid, message: 'Something shorter' }));
    expect(screen.queryByText(/^Past search/)).not.toBeInTheDocument();
    expect(testStore.getState().stream.turns).toHaveLength(2);
  });

  it('lays out like the Xpert sidebar: day dividers, title then time and picks, the open one current', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    const onOpenSession = jest.fn();
    const at = (iso: string, uuid: string, title: string, count = 0) => ({
      uuid, title, first_prompt: 'prompt', item_count: count, last_message_at: iso, created: iso,
    });
    render(
      <IntlProvider locale="en" timeZone="UTC">
        <HistoryPanel
          history={{
            open: true,
            items: [at(new Date().toISOString(), 's-1', 'Today search', 8), at('2026-10-01T12:00:00Z', 's-2', 'Old search')],
            page: 1,
            hasMore: false,
            loading: false,
            error: false,
          }}
          busy={false}
          currentSessionUuid="s-1"
          onClose={onClose}
          onLoadMore={jest.fn()}
          onOpenSession={onOpenSession}
        />
      </IntlProvider>,
    );
    const panel = screen.getByRole('dialog', { name: 'Past searches' });
    const today = within(panel).getByRole('region', { name: 'Today' });
    const current = within(today).getByRole('button', { name: /^Today search .* · 8 picks$/ });
    expect(current).toHaveAttribute('aria-current', 'true');
    const older = within(panel).getByRole('region', { name: 'Older' });
    expect(within(older).getByRole('button', { name: 'Old search Oct 1, 2026' })).not.toHaveAttribute('aria-current');
    await user.click(within(older).getByRole('button', { name: /^Old search/ }));
    expect(onOpenSession).toHaveBeenCalledWith('s-2');
    await user.click(within(panel).getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('groups sessions by today, yesterday, the previous 7 days and older', () => {
    const now = new Date(2026, 10, 9, 16, 0);
    const item = (date: Date, uuid: string) => ({
      uuid, title: uuid, first_prompt: '', item_count: 0, last_message_at: date.toISOString(), created: '',
    });
    const groups = groupByDay([
      item(new Date(2026, 10, 9, 9), 'a'), item(new Date(2026, 10, 9, 1), 'b'), item(new Date(2026, 10, 8, 23), 'c'),
      item(new Date(2026, 10, 3), 'd'), item(new Date(2026, 9, 1), 'e'),
    ], now);
    expect(groups.map(({ day, items }) => [day, items.map(({ uuid }) => uuid)])).toEqual([
      ['today', ['a', 'b']], ['yesterday', ['c']], ['week', ['d']], ['older', ['e']],
    ]);
  });

  it('shows an error when history fails to load', async () => {
    const user = userEvent.setup();
    httpGet.mockRejectedValue(new Error('down'));
    renderTab(new RecordingTransport());
    await user.click(screen.getByRole('button', { name: 'History' }));
    expect(await screen.findByText("We couldn't load your past searches. Try again.")).toBeInTheDocument();
  });

  describe('the conversation id in the URL', () => {
    const LocationProbe = () => <span data-testid="search">{useLocation().search}</span>;
    const renderAt = (path: string, transport: ChatTransport = new FixtureChatTransport({ partDelayMs: 0 })) => render(
      <IntlProvider locale="en">
        <MemoryRouter initialEntries={[path]}>
          <PersonalizedSearchTab store={createPersonalizedSearchStore()} transport={transport} />
          <LocationProbe />
        </MemoryRouter>
      </IntlProvider>,
    );
    const params = () => new URLSearchParams(screen.getByTestId('search').textContent ?? '');

    it('adds ?session=<conversation id> after the first message and removes it on New chat', async () => {
      const user = userEvent.setup();
      renderAt('/test-enterprise?tab=personalized-search');
      expect(params().get('session')).toBeNull();
      await user.click(screen.getByRole('button', { name: 'Prepare for a leadership role' }));
      await waitFor(() => expect(params().get('session')).toBe('00000000-0000-0000-0000-0000000a11ce'));
      expect(params().get('tab')).toBe('personalized-search');
      await user.click(screen.getByRole('button', { name: 'New chat' }));
      await waitFor(() => expect(params().get('session')).toBeNull());
    });

    it('arriving with ?session= (Back from a course page) reopens that conversation', async () => {
      renderAt(`/test-enterprise?tab=personalized-search&session=${DETAIL.uuid}`);
      expect(await screen.findByText(/Past search/)).toBeInTheDocument();
      expect(screen.getByText('Prepare for a leadership role')).toBeInTheDocument();
      expect(httpGet).toHaveBeenCalledWith(`http://ea.test/api/v1/personalized-search/sessions/${DETAIL.uuid}/`, expect.anything());
      expect(params().get('session')).toBe(DETAIL.uuid);
    });

    it('drops an unknown conversation id from the URL and starts fresh', async () => {
      renderAt('/test-enterprise?tab=personalized-search&session=11111111-2222-3333-4444-555555555555');
      await waitFor(() => expect(params().get('session')).toBeNull());
      expect(screen.getByText('Hi! What do you want to learn?')).toBeInTheDocument();
    });
  });
});
