import '@testing-library/jest-dom/extend-expect';
import {
  render, screen, waitFor, within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntlProvider } from '@edx/frontend-platform/i18n';
import { useMediaQuery } from '@openedx/paragon';
import { MemoryRouter } from 'react-router-dom';

import PersonalizedSearchTab from '../adapters/portal/PortalPersonalizedSearchTab';
import type { ChatTransport, SendTurnOptions } from '../core/transports/ChatTransport';
import type { FixtureName } from '../core/transports/FixtureChatTransport';
import { FixtureChatTransport } from '../core/transports/FixtureChatTransport';
import { createPersonalizedSearchStore } from './personalizedSearchStore';
import { useEnterpriseCustomer } from '../../../../app/data';

const testStore = createPersonalizedSearchStore();

jest.mock('@openedx/paragon', () => ({
  ...jest.requireActual('@openedx/paragon'),
  useMediaQuery: jest.fn(),
}));
jest.mock('../../../../app/data', () => ({
  ...jest.requireActual('../../../../app/data'),
  useEnterpriseCustomer: jest.fn(),
}));

/** Replays one golden per send; `delayMs` lets a test act while a turn is streaming. */
class ScriptedTransport implements ChatTransport {
  constructor(private readonly steps: Array<{ fixture: FixtureName; delayMs?: number }>) {}

  async* send({ request, signal }: SendTurnOptions) {
    const { fixture, delayMs = 0 } = this.steps.shift() ?? { fixture: 'normal_turn.sse' as FixtureName };
    yield* new FixtureChatTransport({ partDelayMs: delayMs, pickFixture: () => fixture }).send({ request, signal });
  }
}

let viewportWidth = 375;
const renderTab = (transport: ChatTransport = new ScriptedTransport([])) => render(
  <IntlProvider locale="en">
    <MemoryRouter>
      <PersonalizedSearchTab store={testStore} transport={transport} />
    </MemoryRouter>
  </IntlProvider>,
);

const store = () => testStore.getState();
const waitForIdle = () => waitFor(() => expect(store().stream.activeTurnId).toBeNull());
const chatToggle = () => screen.getByRole('button', { name: 'Chat' });
const pageToggle = () => screen.getByRole('button', { name: /^Page/ });
const chatPane = () => document.getElementById('personalized-search-chat-pane') as HTMLElement;
const pagePane = () => document.getElementById('personalized-search-page-pane') as HTMLElement;

describe('Personalized Search mobile chat/page toggle (chunk 32)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    store().reset();
    viewportWidth = 375;
    (useEnterpriseCustomer as jest.Mock).mockReturnValue({ data: { uuid: 'ent-uuid', slug: 'test-enterprise' } });
    (useMediaQuery as jest.Mock).mockImplementation((q: { minWidth?: number }) => (
      q.minWidth !== undefined ? viewportWidth >= q.minWidth : false
    ));
  });

  it('below 768 px shows only the chat with a Chat/Page toggle, and Page swaps the panes', async () => {
    const user = userEvent.setup();
    viewportWidth = 767;
    renderTab();
    expect(chatToggle()).toHaveAttribute('aria-pressed', 'true');
    expect(chatPane()).toBeVisible();
    expect(pagePane()).not.toBeVisible();

    await user.click(pageToggle());
    expect(pageToggle()).toHaveAttribute('aria-pressed', 'true');
    expect(pagePane()).toBeVisible();
    expect(chatPane()).not.toBeVisible();
    expect(within(pagePane()).getByText(/Your learning page is empty/)).toBeInTheDocument();
  });

  it('at 768 px renders both panes side by side with no toggle', () => {
    viewportWidth = 768;
    const { container } = renderTab();
    expect(container.querySelector('[data-layout="dual"]')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Chat' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('region').map((r) => r.getAttribute('aria-label'))).toEqual(['Chat', 'Your learning page']);
  });

  it('shows "New picks" on the Page toggle once a turn emits its first item section, until the page is viewed', async () => {
    const user = userEvent.setup();
    renderTab(new ScriptedTransport([{ fixture: 'normal_turn.sse', delayMs: 20 }]));
    expect(screen.queryByText('New picks')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Prepare for a leadership role' }));
    await waitFor(() => expect(
      store().stream.turns[0]?.blocks.some(({ block }) => block.type === 'item_section'),
    ).toBe(true));
    expect(within(pageToggle()).getByText('New picks')).toBeInTheDocument();
    await waitForIdle();

    await user.click(pageToggle());
    expect(screen.queryByText('New picks')).not.toBeInTheDocument();
    await user.click(chatToggle());
    expect(screen.queryByText('New picks')).not.toBeInTheDocument();
  });

  it('a stopped turn that discards its picks leaves no "New picks" badge', async () => {
    const user = userEvent.setup();
    renderTab(new ScriptedTransport([{ fixture: 'normal_turn.sse', delayMs: 30 }]));
    await user.click(screen.getByRole('button', { name: 'Prepare for a leadership role' }));
    await waitFor(() => expect(within(pageToggle()).getByText('New picks')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'Stop' }));
    await waitForIdle();
    expect(screen.queryByText('New picks')).not.toBeInTheDocument();
  });

  it('desktop never shows the badge, and a page already seen there stays seen after narrowing', async () => {
    const user = userEvent.setup();
    viewportWidth = 1280;
    const { rerender } = renderTab();
    await user.click(screen.getByRole('button', { name: 'Prepare for a leadership role' }));
    await waitForIdle();
    viewportWidth = 375;
    rerender(
      <IntlProvider locale="en">
        <MemoryRouter>
          <PersonalizedSearchTab store={testStore} transport={new ScriptedTransport([])} />
        </MemoryRouter>
      </IntlProvider>,
    );
    expect(chatToggle()).toBeInTheDocument();
    expect(screen.queryByText('New picks')).not.toBeInTheDocument();
  });

  it('"View page" switches to the page pane showing that turn\'s page', async () => {
    const user = userEvent.setup();
    renderTab(new ScriptedTransport([{ fixture: 'normal_turn.sse' }]));
    await user.click(screen.getByRole('button', { name: 'Prepare for a leadership role' }));
    await waitForIdle();

    await user.click(within(chatPane()).getByRole('button', { name: 'View page' }));
    expect(pagePane()).toBeVisible();
    expect(chatPane()).not.toBeVisible();
    expect(store().viewedTurnId).toBe(store().stream.turns[0].localId);
    expect(within(pagePane()).getByRole('heading', { name: 'Lead with confidence' })).toBeInTheDocument();
  });

  it('"See your last recommendations" on a text-only turn switches to the page pane with the last page', async () => {
    const user = userEvent.setup();
    renderTab(new ScriptedTransport([{ fixture: 'normal_turn.sse' }, { fixture: 'no_match_turn.sse' }]));
    await user.click(screen.getByRole('button', { name: 'Prepare for a leadership role' }));
    await waitForIdle();
    await user.type(screen.getByRole('textbox', { name: 'Message' }), 'Underwater basket weaving');
    await user.click(screen.getByRole('button', { name: 'Send' }));
    await waitForIdle();

    await user.click(within(chatPane()).getByRole('button', { name: 'See your last recommendations' }));
    expect(pagePane()).toBeVisible();
    expect(within(pagePane()).getByRole('heading', { name: 'Lead with confidence' })).toBeInTheDocument();
  });
});
