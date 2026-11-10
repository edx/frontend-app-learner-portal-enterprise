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
import { toTurnRequestBody } from '../core/transports/ChatTransport';
import type { ChatTransport, SendTurnOptions, TurnRequest } from '../core/transports/ChatTransport';
import { createPersonalizedSearchStore } from './personalizedSearchStore';
import { expectFlat } from './analyticsTestUtils';
import { useEnterpriseCustomer } from '../../../../app/data';

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

class Recording implements ChatTransport {
  readonly requests: TurnRequest[] = [];

  async* send({ request, signal }: SendTurnOptions) {
    this.requests.push(request);
    yield* new FixtureChatTransport({ partDelayMs: 0, pickFixture: () => 'normal_turn.sse' }).send({ request, signal });
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
    screen.getByRole('button', { name: 'Why these?' }).focus();
    await waitFor(() => expect(named('explanation_opened').map((p) => p.scope)).toEqual(['tile', 'set']));

    await user.type(screen.getByRole('textbox', { name: 'Message' }), `${LEARNER_TEXT}{Enter}`);
    await waitFor(() => expect(store.getState().stream.activeTurnId).toBeNull());
    expect(named('prompt_submitted')[1]).toEqual(expect.objectContaining({ prompt_source: 'typed', chip_label: null }));

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

  it('a follow-up chip is reported as such', async () => {
    const user = userEvent.setup();
    await sendStarter(user);
    await user.click(screen.getByRole('button', { name: 'Under 4 weeks' }));
    expect(named('prompt_submitted')[1]).toEqual(expect.objectContaining({ prompt_source: 'followup_chip', chip_label: null }));
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
