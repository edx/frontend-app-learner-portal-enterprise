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
        saved: [], dismissedIds: [], dismissed: [], undo: null, error: false,
      },
      feedbackLoaded: false,
      savedOpen: false,
      excludedOpen: false,
      excludedTabShown: false,
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

  it('unsaving from For you shows no "Saved" toast', async () => {
    const user = userEvent.setup();
    http.get.mockImplementation(async (_url: string, { params }: { params: { kind: string } }) => ({
      data: {
        results: params.kind === 'saved'
          ? [{ item_id: 'edX+C1', kind: 'saved', card_snapshot: { ...SAVED_SNAPSHOT, item_id: 'edX+C1' } }]
          : [],
      },
    }));
    await renderWithPage(user);
    await user.click(await screen.findByRole('button', { name: 'Remove Course edX+C1 from saved' }));
    await waitFor(() => expect(http.delete).toHaveBeenCalled());
    await new Promise((resolve) => { setTimeout(resolve, 0); });
    expect(screen.queryByRole('button', { name: 'View saved' })).not.toBeInTheDocument();
  });

  it('a save that fails shows the error, not the "Saved" toast', async () => {
    const user = userEvent.setup();
    await renderWithPage(user);
    await screen.findByRole('tab', { name: 'Saved (1)' });
    http.post.mockRejectedValueOnce(new Error('down'));
    await user.click(screen.getByRole('button', { name: 'Save Course edX+C1' }));
    expect(await screen.findByText("We couldn't save that change. Try again.")).toBeInTheDocument();
    await new Promise((resolve) => { setTimeout(resolve, 0); });
    expect(screen.queryByRole('button', { name: 'View saved' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save Course edX+C1' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('a failed unsave on the Saved tab shows the error above the tabs', async () => {
    const user = userEvent.setup();
    await renderWithPage(user);
    await user.click(await screen.findByRole('tab', { name: 'Saved (1)' }));
    http.delete.mockRejectedValueOnce(new Error('down'));
    const view = screen.getByRole('tabpanel', { name: 'Saved (1)' });
    await user.click(within(view).getByRole('button', { name: 'Remove Saved earlier from saved' }));
    const error = await screen.findByText("We couldn't save that change. Try again.");
    expect(error.closest('[role="tabpanel"]')).toBeNull();
    expect(screen.getByRole('tab', { name: 'Saved (1)' })).toHaveAttribute('aria-selected', 'true');
  });

  it('new results, or an earlier reply\'s, go back from the Saved tab to For you', async () => {
    const user = userEvent.setup();
    await renderWithPage(user);
    const forYouTab = () => screen.getByRole('tab', { name: 'For you' });
    await user.click(await screen.findByRole('tab', { name: 'Saved (1)' }));
    expect(forYouTab()).toHaveAttribute('aria-selected', 'false');

    await user.type(screen.getByRole('textbox', { name: 'Message' }), 'Something shorter');
    await user.click(screen.getByRole('button', { name: 'Send' }));
    expect(forYouTab()).toHaveAttribute('aria-selected', 'true');
    await waitFor(() => expect(store().stream.activeTurnId).toBeNull());

    await user.click(screen.getByRole('tab', { name: 'Saved (1)' }));
    await user.click(screen.getByRole('button', { name: 'View these results' }));
    expect(forYouTab()).toHaveAttribute('aria-selected', 'true');
    expect(store().viewedTurnId).toBe(store().stream.turns[0].localId);
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

  describe('the Excluded tab', () => {
    const excludedTab = () => screen.queryByRole('tab', { name: /^Excluded/ });

    it('is hidden with nothing excluded, appears after Not for me, and Include again lets the item back in', async () => {
      const user = userEvent.setup();
      await renderWithPage(user);
      await screen.findByRole('tab', { name: 'Saved (1)' });
      expect(excludedTab()).not.toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'More options for Course edX+C1' }));
      await user.click(await screen.findByRole('button', { name: 'Not for me' }));
      // Paragon's overflow "More..." tab always renders in jsdom (no layout), so leave it out.
      const tabs = screen.getAllByRole('tab').map((tab) => tab.textContent).filter((name) => name !== 'More...');
      expect(tabs).toEqual(['For you', 'Excluded (1)', 'Saved (1)']);

      await user.click(screen.getByRole('tab', { name: 'Excluded (1)' }));
      const view = screen.getByRole('tabpanel', { name: 'Excluded (1)' });
      expect(within(view).getByRole('link', { name: 'Course edX+C1' })).toBeInTheDocument();
      await user.click(within(view).getByRole('button', { name: 'Include again: Course edX+C1' }));
      expect(http.delete).toHaveBeenCalledWith(URL, {
        params: { enterprise_customer_uuid: 'ent-uuid', item_id: 'edX+C1', kind: 'not_interested' },
      });
      // Empty now: back on For you with the item showing, and the tab stays, disabled, until a reload.
      expect(await screen.findByRole('tab', { name: 'For you' })).toHaveAttribute('aria-selected', 'true');
      expect(screen.getAllByRole('link', { name: 'Course edX+C1' }).length).toBeGreaterThan(0);
      expect(excludedTab()).toHaveTextContent('Excluded (0)');
      expect(excludedTab()).toHaveClass('disabled');
    });

    it('shows on load when the learner excluded items before, and not after a reload with none', async () => {
      const user = userEvent.setup();
      http.get.mockImplementation(async (_url: string, { params }: { params: { kind: string } }) => ({
        data: {
          results: params.kind === 'not_interested'
            ? [{ item_id: 'edX+GONE', kind: 'not_interested', card_snapshot: { ...SAVED_SNAPSHOT, item_id: 'edX+GONE', title: 'Excluded earlier' } }]
            : [],
        },
      }));
      await renderWithPage(user);
      await user.click(await screen.findByRole('tab', { name: 'Excluded (1)' }));
      expect(screen.getByRole('link', { name: 'Excluded earlier' })).toBeInTheDocument();
    });

    it('Include again on another item keeps the Undo offer; on the Undo item it clears it', async () => {
      const user = userEvent.setup();
      http.get.mockImplementation(async (_url: string, { params }: { params: { kind: string } }) => ({
        data: {
          results: params.kind === 'not_interested'
            ? [{ item_id: 'edX+GONE', kind: 'not_interested', card_snapshot: { ...SAVED_SNAPSHOT, item_id: 'edX+GONE', title: 'Excluded earlier' } }]
            : [],
        },
      }));
      await renderWithPage(user);
      await screen.findByRole('tab', { name: 'Excluded (1)' });

      await user.click(screen.getByRole('button', { name: 'More options for Course edX+C1' }));
      await user.click(await screen.findByRole('button', { name: 'Not for me' }));
      await user.click(screen.getByRole('tab', { name: 'Excluded (2)' }));
      await user.click(screen.getByRole('button', { name: 'Include again: Excluded earlier' }));
      expect(http.delete).toHaveBeenCalledWith(URL, {
        params: { enterprise_customer_uuid: 'ent-uuid', item_id: 'edX+GONE', kind: 'not_interested' },
      });
      expect(store().feedback.undo?.item_id).toBe('edX+C1');
      expect(screen.getByRole('button', { name: 'Undo' })).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Include again: Course edX+C1' }));
      expect(store().feedback.undo).toBeNull();
      await waitFor(() => expect(screen.queryByRole('button', { name: 'Undo' })).not.toBeInTheDocument());
    });
  });

  it('Not for me on the top pick moves the next compare option into its place, and Undo puts it back', async () => {
    const user = userEvent.setup();
    await renderWithPage(user);
    const topPick = () => document.querySelector('.personalized-search__top-pick') as HTMLElement;
    const compare = () => document.querySelector('.personalized-search__compare') as HTMLElement;
    expect(within(topPick()).getByRole('link', { name: 'Program p-1' })).toBeInTheDocument();
    expect(within(compare()).getByRole('link', { name: 'Course Yale+E1' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Not for me: Program p-1' }));
    expect(within(topPick()).getByRole('link', { name: 'Course Yale+E1' })).toBeInTheDocument();
    expect(within(topPick()).getByText('Best for an executive-level perspective')).toBeInTheDocument();
    // The removed pick's reason and checks were about it, so they go with it.
    expect(within(topPick()).queryByText('Because you want to lead a team and earn a credential.')).not.toBeInTheDocument();
    expect(within(topPick()).queryByText('Certificate')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Program p-1' })).not.toBeInTheDocument();
    expect(within(compare()).queryByRole('link', { name: 'Course Yale+E1' })).not.toBeInTheDocument();
    expect(within(compare()).getByRole('link', { name: 'Course edX+C3' })).toBeInTheDocument();

    // Removing the promoted pick moves up the next one.
    await user.click(screen.getByRole('button', { name: 'Not for me: Course Yale+E1' }));
    expect(within(topPick()).getByRole('link', { name: 'Course edX+C3' })).toBeInTheDocument();
    expect(compare()).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Undo' }));
    expect(within(topPick()).getByRole('link', { name: 'Course Yale+E1' })).toBeInTheDocument();
    expect(within(compare()).getByRole('link', { name: 'Course edX+C3' })).toBeInTheDocument();
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

  describe('thumbs on replies', () => {
    const RATE_URL = (session: string) => `http://ea.test/api/v1/personalized-search/sessions/${session}/turns/1/feedback/`;

    it('rates a reply, toggles it off, and sends the rating for that turn', async () => {
      const user = userEvent.setup();
      await renderWithPage(user);
      const session = store().stream.session.sessionUuid as string;
      const up = screen.getByRole('button', { name: 'Helpful' });
      await user.click(up);
      expect(up).toHaveAttribute('aria-pressed', 'true');
      expect(http.post).toHaveBeenLastCalledWith(RATE_URL(session), { enterprise_customer_uuid: 'ent-uuid', rating: 1 });
      await user.click(up);
      await waitFor(() => expect(up).toHaveAttribute('aria-pressed', 'false'));
      expect(http.post).toHaveBeenLastCalledWith(RATE_URL(session), { enterprise_customer_uuid: 'ent-uuid', rating: null });
      await user.click(screen.getByRole('button', { name: 'Not helpful' }));
      expect(screen.getByRole('button', { name: 'Not helpful' })).toHaveAttribute('aria-pressed', 'true');
    });

    it('reverts when the call fails, and hides the thumbs when the server has no rating endpoint', async () => {
      const user = userEvent.setup();
      await renderWithPage(user);
      http.post.mockRejectedValueOnce(new Error('down'));
      await user.click(screen.getByRole('button', { name: 'Helpful' }));
      await waitFor(() => expect(screen.getByRole('button', { name: 'Helpful' })).toHaveAttribute('aria-pressed', 'false'));
      http.post.mockRejectedValueOnce(Object.assign(new Error('missing'), { response: { status: 404 } }));
      await user.click(screen.getByRole('button', { name: 'Helpful' }));
      await waitFor(() => expect(screen.queryByRole('button', { name: 'Helpful' })).not.toBeInTheDocument());
    });

    it('a slow failure of an earlier click doesn\'t undo the latest rating', async () => {
      const user = userEvent.setup();
      await renderWithPage(user);
      let failFirst: (error: Error) => void = () => {};
      http.post.mockImplementationOnce(() => new Promise((_, reject) => { failFirst = reject; }));
      const up = screen.getByRole('button', { name: 'Helpful' });
      await user.click(up); // on (held)
      await user.click(up); // off
      await user.click(up); // on again
      expect(up).toHaveAttribute('aria-pressed', 'true');
      failFirst(new Error('down'));
      await waitFor(() => expect(http.post).toHaveBeenCalledTimes(3));
      await new Promise((resolve) => { setTimeout(resolve, 0); });
      expect(up).toHaveAttribute('aria-pressed', 'true');
    });
  });
});
