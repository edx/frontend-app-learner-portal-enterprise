import '@testing-library/jest-dom/extend-expect';
import {
  render, screen, waitFor, within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntlProvider } from '@edx/frontend-platform/i18n';
import { getAuthenticatedHttpClient } from '@edx/frontend-platform/auth';
import { useMediaQuery } from '@openedx/paragon';
import { MemoryRouter } from 'react-router-dom';
import { sendEnterpriseTrackEvent } from '@2uinc/frontend-enterprise-utils';

import PersonalizedSearchTab from '../adapters/portal/PortalPersonalizedSearchTab';
import { PERSONALIZED_SEARCH_EVENTS } from '../../../../../eventTracking';
import { FixtureChatTransport } from '../core/transports/FixtureChatTransport';
import type { FixtureName } from '../core/transports/FixtureChatTransport';
import { toTurnRequestBody, TransportError } from '../core/transports/ChatTransport';
import type { ChatTransport, SendTurnOptions, TurnRequest } from '../core/transports/ChatTransport';
import { createPersonalizedSearchStore } from './personalizedSearchStore';
import { expectFlat } from './analyticsTestUtils';
import { useEnterpriseCustomer } from '../../../../app/data';

/** A follow-up chip by its text (results headings can share it, e.g. "Programs"). */
const followUpChip = (text: string) => screen.getAllByText(text)
  .map((el) => el.closest('.pgn__chip') as HTMLElement)
  .find(Boolean) as HTMLElement;

jest.mock('@2uinc/frontend-enterprise-utils', () => ({
  ...jest.requireActual('@2uinc/frontend-enterprise-utils'),
  sendEnterpriseTrackEvent: jest.fn(),
}));
jest.mock('@openedx/paragon', () => ({
  ...jest.requireActual('@openedx/paragon'),
  useMediaQuery: jest.fn(),
}));
jest.mock('@edx/frontend-platform/auth', () => ({
  ...jest.requireActual('@edx/frontend-platform/auth'),
  getAuthenticatedHttpClient: jest.fn(),
}));
jest.mock('../../../../app/data', () => ({
  ...jest.requireActual('../../../../app/data'),
  useEnterpriseCustomer: jest.fn(),
}));

const LEARNER_TEXT = 'zq-learner-text-5521';
const JOIN = {
  conversation_id: '00000000-0000-0000-0000-0000000a11ce', turn_id: '00000000-0000-0000-0000-000000000b0b', turn_index: 1,
};

/** The second message's turn: its own join keys in the same conversation. */
const JOIN_2 = { ...JOIN, turn_id: 'turn-2', turn_index: 2 };

class Recording implements ChatTransport {
  readonly requests: TurnRequest[] = [];

  /** Goldens for the next sends, in order (`fail`: a 503 before the stream); then the normal turn. */
  readonly fixtures: Array<FixtureName | 'fail'> = [];

  async* send({ request, signal }: SendTurnOptions) {
    this.requests.push(request);
    const fixture = this.fixtures.shift() ?? 'normal_turn.sse';
    if (fixture === 'fail') { throw new TransportError(503); }
    const later = this.requests.length > 1;
    const golden = new FixtureChatTransport({ partDelayMs: 0, pickFixture: () => fixture });
    // eslint-disable-next-line no-restricted-syntax
    for await (const part of golden.send({ request, signal })) {
      yield (later && part.type === 'data-analytics' ? { ...part, data: { ...part.data, ...JOIN_2 } } : part);
    }
  }
}

const events = () => (sendEnterpriseTrackEvent as jest.Mock).mock.calls.map(([, name, props]) => ({ name, props }));
const named = (action: keyof typeof PERSONALIZED_SEARCH_EVENTS) => events()
  .filter((e) => e.name === PERSONALIZED_SEARCH_EVENTS[action]).map((e) => e.props);

describe('Personalized Search usage events: what the client sends', () => {
  const http = { get: jest.fn(), post: jest.fn(), delete: jest.fn() };
  let transport: Recording;
  let store: ReturnType<typeof createPersonalizedSearchStore>;

  beforeEach(() => {
    jest.clearAllMocks();
    (useEnterpriseCustomer as jest.Mock).mockReturnValue({ data: { uuid: 'ent-uuid', slug: 'test-enterprise' } });
    (useMediaQuery as jest.Mock).mockReturnValue(true);
    http.get.mockResolvedValue({ data: { results: [] } });
    http.post.mockResolvedValue({ data: {} });
    http.delete.mockResolvedValue({});
    (getAuthenticatedHttpClient as jest.Mock).mockReturnValue(http);
    transport = new Recording();
    store = createPersonalizedSearchStore();
    render(
      <IntlProvider locale="en">
        <MemoryRouter>
          <PersonalizedSearchTab store={store} transport={transport} />
        </MemoryRouter>
      </IntlProvider>,
    );
  });

  const sendStarter = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.click(screen.getByRole('button', { name: 'Prepare for a leadership role' }));
    await waitFor(() => expect(store.getState().stream.activeTurnId).toBeNull());
  };

  it('a conversation sends raw facts and the server join keys, and never learner text or aggregates', async () => {
    const user = userEvent.setup();
    await sendStarter(user);
    expect(named('prompt_submitted')[0]).toEqual(expect.objectContaining({
      prompt_source: 'starter_chip', chip_label: 'Prepare for a leadership role',
    }));
    expect(named('results_rendered')).toEqual([expect.objectContaining(JOIN)]);

    await user.click(screen.getByRole('link', { name: 'Course edX+C1' }));
    expect(named('result_clicked')[0]).toEqual(expect.objectContaining({
      ...JOIN, item_key: 'edX+C1', item_type: 'course', item_section: 'course', item_position: 5,
    }));

    await user.click(screen.getByRole('button', { name: 'Save Course edX+C2' }));
    expect(named('item_save_toggled')[0]).toEqual(expect.objectContaining({ item_key: 'edX+C2', saved: true }));

    await user.click(screen.getByRole('button', { name: 'More options for Course edX+C1' }));
    await user.click(await screen.findByRole('button', { name: 'Not for me' }));
    await user.click(await screen.findByRole('button', { name: 'Undo' }));
    expect(named('item_dismissed').map((p) => p.dismissed)).toEqual([true, false]);

    const card = screen.getByRole('link', { name: 'Course edX+C2' }).closest('.personalized-search__card') as HTMLElement;
    await user.click(within(card).getByRole('button', { name: 'Why this?' }));
    await user.click(screen.getByRole('button', { name: 'Why these?' }));
    await waitFor(() => expect(named('explanation_opened').map((p) => p.scope)).toEqual(['tile', 'set']));

    await user.type(screen.getByRole('textbox', { name: 'Message' }), `${LEARNER_TEXT}{Enter}`);
    await waitFor(() => expect(store.getState().stream.activeTurnId).toBeNull());
    expect(named('prompt_submitted')).toEqual([
      expect.objectContaining(JOIN),
      expect.objectContaining({ ...JOIN_2, prompt_source: 'typed', chip_label: null }),
    ]);

    await user.click(screen.getByRole('tab', { name: /Saved/ }));
    await user.click(screen.getByRole('button', { name: 'New chat' }));
    await user.click(screen.getByRole('button', { name: 'History' }));
    expect(named('saved_tab_opened')).toHaveLength(1);
    expect(named('history_opened')).toHaveLength(1);
    expect(named('new_chat_started')).toEqual([expect.objectContaining({ conversation_id: JOIN.conversation_id })]);

    events().forEach(({ props }) => {
      expectFlat(props);
      expect(JSON.stringify(props)).not.toContain(LEARNER_TEXT);
      expect(props).toEqual(expect.objectContaining({ enterprise_customer_uuid: 'ent-uuid', viewport: 'desktop' }));
    });
  });

  it('a fixed follow-up chip is reported with its label; an AI-suggested chip without its text', async () => {
    const user = userEvent.setup();
    await sendStarter(user);
    await user.click(followUpChip('Programs'));
    await waitFor(() => expect(named('prompt_submitted')[1]).toEqual(
      expect.objectContaining({ prompt_source: 'followup_chip', chip_label: 'Programs' }),
    ));
    await waitFor(() => expect(store.getState().stream.activeTurnId).toBeNull());
    await user.click(screen.getByText('Giving feedback to my team'));
    await waitFor(() => expect(named('prompt_submitted')[2]).toEqual(
      expect.objectContaining({ prompt_source: 'suggested_chip', chip_label: null }),
    ));
  });

  it('Retry resends with the original prompt source', async () => {
    const user = userEvent.setup();
    transport.fixtures.push('error_turn.sse');
    await sendStarter(user);
    await user.click(await screen.findByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(store.getState().stream.activeTurnId).toBeNull());
    const starter = { prompt_source: 'starter_chip', chip_label: 'Prepare for a leadership role' };
    expect(named('prompt_submitted')).toEqual([expect.objectContaining(starter), expect.objectContaining(starter)]);
  });

  it('a prompt is sent with its own turn\'s join keys once they arrive, and without keys if the turn fails first', async () => {
    const user = userEvent.setup();
    transport.fixtures.push('normal_turn.sse', 'fail');
    await sendStarter(user);
    await user.type(screen.getByRole('textbox', { name: 'Message' }), 'Something shorter{Enter}');
    await waitFor(() => expect(store.getState().stream.activeTurnId).toBeNull());
    const [first, failed] = named('prompt_submitted');
    expect(first).toEqual(expect.objectContaining(JOIN));
    expect(failed).toEqual(expect.objectContaining({ prompt_source: 'typed', enterprise_customer_uuid: 'ent-uuid' }));
    expect(failed).not.toHaveProperty('conversation_id');
    expect(failed).not.toHaveProperty('turn_id');
    expect(named('prompt_submitted')).toHaveLength(2);
  });

  it('item events carry the join keys of the turn whose results are on screen, not the newest turn', async () => {
    const user = userEvent.setup();
    await sendStarter(user);
    await user.type(screen.getByRole('textbox', { name: 'Message' }), 'Something shorter{Enter}');
    await waitFor(() => expect(store.getState().stream.activeTurnId).toBeNull());

    await user.click(screen.getByRole('button', { name: 'View these results' }));
    await user.click(screen.getByRole('link', { name: 'Course edX+C1' }));
    await user.click(screen.getByRole('button', { name: 'Save Course edX+C2' }));
    await user.click(screen.getByRole('button', { name: 'Why these?' }));
    await waitFor(() => expect(named('explanation_opened')).toHaveLength(1));
    [...named('result_clicked'), ...named('item_save_toggled'), ...named('explanation_opened')].forEach((props) => {
      expect(props).toEqual(expect.objectContaining({ turn_id: JOIN.turn_id, turn_index: 1 }));
    });

    await user.click(screen.getByRole('button', { name: 'Back to latest results' }));
    await user.click(screen.getByRole('link', { name: 'Course edX+C1' }));
    expect(named('result_clicked')[1]).toEqual(expect.objectContaining({ turn_id: JOIN_2.turn_id, turn_index: 2 }));
  });

  it('item events on the Saved tab report the tab, not the section the card was saved from', async () => {
    const user = userEvent.setup();
    await sendStarter(user);
    await user.click(screen.getByRole('button', { name: 'Save Course edX+C2' }));
    expect(named('item_save_toggled')[0]).toEqual(expect.objectContaining({
      item_key: 'edX+C2', item_section: 'course', item_position: 6, saved: true,
    }));

    await user.click(screen.getByRole('tab', { name: /Saved/ }));
    const savedTab = screen.getByRole('tabpanel', { name: /Saved/ });
    await user.click(within(savedTab).getByRole('link', { name: 'Course edX+C2' }));
    expect(named('result_clicked')[0]).toEqual(expect.objectContaining({
      item_key: 'edX+C2', item_section: 'saved_tab', item_position: null,
    }));
    await user.click(within(savedTab).getByRole('button', { name: 'Remove Course edX+C2 from saved' }));
    expect(named('item_save_toggled')[1]).toEqual(expect.objectContaining({
      item_key: 'edX+C2', item_section: 'saved_tab', item_position: null, saved: false,
    }));
  });

  it('opening the Excluded tab is reported once, and Include again sends dismissed: false', async () => {
    const user = userEvent.setup();
    await sendStarter(user);
    await user.click(screen.getByRole('button', { name: 'More options for Course edX+C1' }));
    await user.click(await screen.findByRole('button', { name: 'Not for me' }));
    expect(named('excluded_tab_opened')).toHaveLength(0);

    await user.click(screen.getByRole('tab', { name: /Excluded/ }));
    expect(named('excluded_tab_opened')).toHaveLength(1);
    const excludedTab = screen.getByRole('tabpanel', { name: /Excluded/ });
    await user.click(within(excludedTab).getByRole('button', { name: 'Include again: Course edX+C1' }));
    expect(named('item_dismissed')).toEqual([
      expect.objectContaining({ item_key: 'edX+C1', dismissed: true }),
      expect.objectContaining({ item_key: 'edX+C1', dismissed: false }),
    ]);
    expect(named('excluded_tab_opened')).toHaveLength(1);
  });
});

describe('the turn request', () => {
  it('flags the first message after reopening a past search, and stays unchanged otherwise', () => {
    const base = { enterpriseCustomerUuid: 'e', sessionUuid: 's', message: 'm' };
    expect(toTurnRequestBody(base)).toEqual({ enterprise_customer_uuid: 'e', session_uuid: 's', message: 'm' });
    expect(toTurnRequestBody({ ...base, resumedFromHistory: true }))
      .toEqual(expect.objectContaining({ resumed_from_history: true }));
  });
});
