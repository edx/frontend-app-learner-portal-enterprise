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
import type { ChatTransport, SendTurnOptions } from '../../core/transports/ChatTransport';
import { FixtureChatTransport } from '../../core/transports/FixtureChatTransport';
import { createPersonalizedSearchStore } from '../../feature/personalizedSearchStore';
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

class Replay implements ChatTransport {
  // eslint-disable-next-line class-methods-use-this
  async* send({ request, signal }: SendTurnOptions) {
    yield* new FixtureChatTransport({ partDelayMs: 0, pickFixture: () => 'normal_turn.sse' }).send({ request, signal });
  }
}

const URL = 'http://ea.test/api/v1/personalized-search/item-feedback/';
const SAVED_SNAPSHOT = {
  item_id: 'edX+OLD1',
  item_type: 'course',
  title: 'Saved earlier',
  image_url: null,
  partner_name: 'edX',
  partner_logo_url: null,
  link: { kind: 'course', course_key: 'edX+OLD1', course_type: null },
  facts: {},
  why: null,
  fit: [],
};

describe('Save / Not interested and the Saved view (chunk 31)', () => {
  const http = { get: jest.fn(), post: jest.fn(), delete: jest.fn() };
  const store = () => testStore.getState();

  beforeEach(() => {
    jest.clearAllMocks();
    testStore.setState({
      feedback: {
        saved: [], dismissedIds: [], undo: null, error: false,
      },
      feedbackLoaded: false,
      savedOpen: false,
    });
    store().reset();
    (useEnterpriseCustomer as jest.Mock).mockReturnValue({ data: { uuid: 'ent-uuid', slug: 'test-enterprise' } });
    (useMediaQuery as jest.Mock).mockImplementation((q: { minWidth?: number }) => q.minWidth !== undefined);
    http.get.mockImplementation(async (_url: string, { params }: { params: { kind: string } }) => ({
      data: { results: params.kind === 'saved' ? [{ item_id: 'edX+OLD1', kind: 'saved', card_snapshot: SAVED_SNAPSHOT }] : [] },
    }));
    http.post.mockResolvedValue({ data: {} });
    http.delete.mockResolvedValue({});
    (getAuthenticatedHttpClient as jest.Mock).mockReturnValue(http);
  });

  const renderWithPage = async (user: ReturnType<typeof userEvent.setup>) => {
    render(
      <IntlProvider locale="en">
        <MemoryRouter>
          <PersonalizedSearchTab store={testStore} transport={new Replay()} />
        </MemoryRouter>
      </IntlProvider>,
    );
    await user.click(screen.getByRole('button', { name: 'Prepare for a leadership role' }));
    await waitFor(() => expect(store().stream.activeTurnId).toBeNull());
  };

  it('loads saved items once the page has picks, and saves/unsaves with the snapshot', async () => {
    const user = userEvent.setup();
    await renderWithPage(user);
    expect(await screen.findByRole('tab', { name: 'Saved (1)' })).toBeInTheDocument();

    const save = screen.getByRole('button', { name: 'Save Course edX+C1' });
    expect(save).toHaveAttribute('aria-pressed', 'false');
    await user.click(save);
    const unsave = screen.getByRole('button', { name: 'Remove Course edX+C1 from saved' });
    expect(unsave).toHaveAttribute('aria-pressed', 'true');
    expect(http.post).toHaveBeenCalledWith(URL, expect.objectContaining({
      enterprise_customer_uuid: 'ent-uuid',
      item_id: 'edX+C1',
      kind: 'saved',
      card_snapshot: expect.objectContaining({ title: 'Course edX+C1' }),
    }));
    expect(screen.getByRole('tab', { name: 'Saved (2)' })).toBeInTheDocument();

    await user.click(unsave);
    expect(http.delete).toHaveBeenCalledWith(URL, {
      params: { enterprise_customer_uuid: 'ent-uuid', item_id: 'edX+C1', kind: 'saved' },
    });
    expect(screen.getByRole('tab', { name: 'Saved (1)' })).toBeInTheDocument();
  });

  it('the Saved tab lists saved snapshots, unsaving removes the card, and the empty state explains the tab', async () => {
    const user = userEvent.setup();
    await renderWithPage(user);
    await user.click(await screen.findByRole('tab', { name: 'Saved (1)' }));
    const view = screen.getByRole('tabpanel', { name: 'Saved (1)' });
    expect(within(view).getByRole('link', { name: 'Saved earlier' })).toBeInTheDocument();
    await user.click(within(view).getByRole('button', { name: 'Remove Saved earlier from saved' }));
    expect(screen.getByRole('tab', { name: 'Saved (0)' })).toBeInTheDocument();
    expect(screen.getByText('Save recommendations to compare them later. Saved items stay here across chats.'))
      .toBeInTheDocument();
  });

  it('saving from For you shows a "Saved" toast whose action opens the Saved tab', async () => {
    const user = userEvent.setup();
    await renderWithPage(user);
    await screen.findByRole('tab', { name: 'Saved (1)' });
    await user.click(screen.getByRole('button', { name: 'Save Course edX+C1' }));
    await user.click(await screen.findByRole('button', { name: 'View saved' }));
    expect(screen.getByRole('tab', { name: 'Saved (2)' })).toHaveAttribute('aria-selected', 'true');
  });

  it('Not interested hides the card with Undo, by keyboard', async () => {
    const user = userEvent.setup();
    await renderWithPage(user);
    screen.getByRole('button', { name: 'More options for Course edX+C1' }).focus();
    await user.keyboard('{Enter}');
    await user.click(await screen.findByRole('button', { name: 'Not for me' }));
    expect(screen.queryByRole('link', { name: 'Course edX+C1' })).not.toBeInTheDocument();
    expect(http.post).toHaveBeenCalledWith(URL, expect.objectContaining({ item_id: 'edX+C1', kind: 'not_interested' }));
    expect(screen.getByText(/Removed Course edX\+C1/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Undo' }));
    expect(screen.getByRole('link', { name: 'Course edX+C1' })).toBeInTheDocument();
    expect(http.delete).toHaveBeenCalledWith(URL, {
      params: { enterprise_customer_uuid: 'ent-uuid', item_id: 'edX+C1', kind: 'not_interested' },
    });
  });

  it('reverts and shows an Alert when the server call fails', async () => {
    const user = userEvent.setup();
    http.post.mockRejectedValue(new Error('down'));
    await renderWithPage(user);
    await user.click(screen.getByRole('button', { name: 'More options for Course edX+C1' }));
    await user.click(await screen.findByRole('button', { name: 'Not for me' }));
    expect(await screen.findByText("We couldn't save that change. Try again.")).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Course edX+C1' })).toBeInTheDocument();
  });
});
