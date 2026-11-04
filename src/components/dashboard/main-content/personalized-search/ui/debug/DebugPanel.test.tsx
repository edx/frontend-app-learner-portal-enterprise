import '@testing-library/jest-dom/extend-expect';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { getAuthenticatedHttpClient } from '@edx/frontend-platform/auth';
import { IntlProvider } from '@edx/frontend-platform/i18n';
import { useMediaQuery } from '@openedx/paragon';
import { MemoryRouter } from 'react-router-dom';

import PersonalizedSearchTab from '../../adapters/portal/PortalPersonalizedSearchTab';
import { DEBUG_SETTINGS_STORAGE_KEY, loadDebugSettings, createPersonalizedSearchStore } from '../../feature/personalizedSearchStore';
import { installStreamGlobals, readGoldenBytes, streamFromBytes } from '../../core/stream/testUtils';
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
  getConfig: () => ({ PERSONALIZED_SEARCH_API_BASE_URL: 'http://ea.test', ENTERPRISE_ACCESS_BASE_URL: 'http://ea.default' }),
}));
jest.mock('../../../../../app/data', () => ({
  ...jest.requireActual('../../../../../app/data'),
  useEnterpriseCustomer: jest.fn(),
}));

const DEBUG_CONFIG = {
  models: [
    {
      id: 'gpt-4.1', price_in: 2, price_cached_in: 0.5, price_out: 8, efforts: [null],
    },
    {
      id: 'gpt-5.4-mini', price_in: 0.75, price_cached_in: 0.075, price_out: 4.5, efforts: ['none', 'low', 'medium', 'high'],
    },
    {
      id: 'xpert', label: 'Xpert platform', price_in: null, price_cached_in: null, price_out: null, efforts: [null],
    },
  ],
  defaults: {
    intent_model: 'gpt-4.1-mini', intent_effort: null, compose_model: 'gpt-5.4-mini', compose_effort: 'low',
  },
  catalog: 'Example catalog',
};

const renderTab = (path: string) => render(
  <IntlProvider locale="en">
    <MemoryRouter initialEntries={[path]}>
      <PersonalizedSearchTab store={testStore} />
    </MemoryRouter>
  </IntlProvider>,
);

describe('Personalized Search debug panel (?debug=true)', () => {
  const httpGet = jest.fn();
  let fetchMock: jest.Mock;

  beforeAll(installStreamGlobals);

  beforeEach(() => {
    jest.clearAllMocks();
    window.localStorage.clear();
    testStore.setState({
      debugSettings: loadDebugSettings(), debugConfig: undefined, debugConfigError: null,
    });
    testStore.getState().reset();
    (useEnterpriseCustomer as jest.Mock).mockReturnValue({ data: { uuid: 'ent-uuid', slug: 'test-enterprise' } });
    (useMediaQuery as jest.Mock).mockReturnValue(true);
    httpGet.mockImplementation(async (url: string) => (
      url.endsWith('/csrf/api/v1/token') ? { data: { csrfToken: 'csrf' } } : { data: DEBUG_CONFIG }
    ));
    (getAuthenticatedHttpClient as jest.Mock).mockReturnValue({ get: httpGet });
    fetchMock = jest.fn().mockImplementation(async () => ({
      ok: true, status: 200, body: streamFromBytes(readGoldenBytes('normal_turn.sse')),
    }));
    (globalThis as { fetch?: unknown }).fetch = fetchMock;
  });

  it('is hidden without ?debug=true', () => {
    renderTab('/test-enterprise?tab=personalized-search');
    expect(screen.queryByTestId('personalized-search-debug')).not.toBeInTheDocument();
    expect(httpGet).not.toHaveBeenCalled();
  });

  it('loads the model menu, sends the chosen model and lists the turn in the benchmark table', async () => {
    const user = userEvent.setup();
    renderTab('/test-enterprise?tab=personalized-search&debug=true');
    expect(await screen.findByText('Catalog: Example catalog')).toBeInTheDocument();
    expect(httpGet).toHaveBeenCalledWith(
      'http://ea.test/api/v1/personalized-search/debug/',
      { params: { enterprise_customer_uuid: 'ent-uuid' } },
    );

    await user.selectOptions(screen.getByLabelText('Compose model'), 'gpt-4.1');
    expect(screen.getByLabelText('Reasoning', { selector: '#ps-debug-compose-effort' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Prepare for a leadership role' }));

    await waitFor(() => expect(testStore.getState().stream.activeTurnId).toBeNull());
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://ea.test/api/v1/personalized-search/turns/');
    expect(JSON.parse(init.body).debug).toEqual({ compose_model: 'gpt-4.1', compose_effort: null });
    expect(screen.getByRole('button', { name: 'Copy results as JSON' })).toBeInTheDocument();
    expect(JSON.parse(window.localStorage.getItem(DEBUG_SETTINGS_STORAGE_KEY) as string))
      .toEqual(expect.objectContaining({ composeModel: 'gpt-4.1', live: true }));
  });

  it('offers the Xpert platform without token pricing and sends it as the override', async () => {
    const user = userEvent.setup();
    renderTab('/test-enterprise?tab=personalized-search&debug=true');
    await screen.findByText('Catalog: Example catalog');
    const option = screen.getAllByRole('option', { name: 'Xpert platform · no token pricing' });
    expect(option).toHaveLength(2); // compose and intent pickers
    await user.selectOptions(screen.getByLabelText('Compose model'), 'xpert');
    await user.selectOptions(screen.getByLabelText('Intent model'), 'xpert');
    await user.click(screen.getByRole('button', { name: 'Build data skills' }));
    await waitFor(() => expect(testStore.getState().stream.activeTurnId).toBeNull());
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).debug).toEqual({
      intent_model: 'xpert', intent_effort: null, compose_model: 'xpert', compose_effort: null,
    });
  });

  it('turning Live AI off replays fixtures without calling enterprise-access', async () => {
    const user = userEvent.setup();
    renderTab('/test-enterprise?tab=personalized-search&debug=true');
    await user.click(await screen.findByRole('switch', { name: /Live AI/ }));
    expect(screen.getByText('Canned fixture replies, no model calls')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Learn AI for my job' }));
    await waitFor(() => expect(testStore.getState().stream.turns[0]?.status).toBe('done'), { timeout: 8000 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('says the switcher is off when the server has debug overrides disabled', async () => {
    httpGet.mockImplementation(async () => { throw Object.assign(new Error('nope'), { response: { status: 404 } }); });
    renderTab('/test-enterprise?tab=personalized-search&debug=true');
    expect(await screen.findByText(/debug overrides disabled/)).toBeInTheDocument();
  });
});
