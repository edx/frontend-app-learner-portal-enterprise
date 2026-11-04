import '@testing-library/jest-dom/extend-expect';
import {
  render, screen, waitFor, within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { getAuthenticatedHttpClient } from '@edx/frontend-platform/auth';
import { IntlProvider } from '@edx/frontend-platform/i18n';
import { useMediaQuery } from '@openedx/paragon';
import { MemoryRouter } from 'react-router-dom';

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
    await within(panel).findByRole('button', { name: 'Becoming a team lead' });
    expect(httpGet).toHaveBeenCalledWith(
      'http://ea.test/api/v1/personalized-search/sessions/',
      { params: { enterprise_customer_uuid: 'ent-uuid', page: 1 } },
    );
    expect(within(panel).getAllByRole('button', { name: /^(Becoming|Search)/ })).toHaveLength(20);
    await user.click(within(panel).getByRole('button', { name: 'Load more' }));
    await waitFor(() => expect(within(panel).getAllByRole('button', { name: /^(Becoming|Search)/ })).toHaveLength(21));

    await user.click(within(panel).getByRole('button', { name: 'Becoming a team lead' }));
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

  it('shows an error when history fails to load', async () => {
    const user = userEvent.setup();
    httpGet.mockRejectedValue(new Error('down'));
    renderTab(new RecordingTransport());
    await user.click(screen.getByRole('button', { name: 'History' }));
    expect(await screen.findByText("We couldn't load your past searches. Try again.")).toBeInTheDocument();
  });
});
