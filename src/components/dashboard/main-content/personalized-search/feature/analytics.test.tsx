import '@testing-library/jest-dom/extend-expect';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntlProvider } from '@edx/frontend-platform/i18n';
import { logError } from '@edx/frontend-platform/logging';
import { useMediaQuery } from '@openedx/paragon';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { sendEnterpriseTrackEvent } from '@2uinc/frontend-enterprise-utils';

import PersonalizedSearchTab from '../adapters/portal/PortalPersonalizedSearchTab';
import { getPortalEntryPoint, trackPersonalizedSearchEvent } from '../adapters/portal/analytics';
import { PERSONALIZED_SEARCH_EVENTS } from '../../../../../eventTracking';
import { FixtureChatTransport } from '../core/transports/FixtureChatTransport';
import { createPersonalizedSearchStore } from './personalizedSearchStore';
import { useEnterpriseCustomer } from '../../../../app/data';
import { expectFlat } from './analyticsTestUtils';

jest.mock('@2uinc/frontend-enterprise-utils', () => ({
  ...jest.requireActual('@2uinc/frontend-enterprise-utils'),
  sendEnterpriseTrackEvent: jest.fn(),
}));
jest.mock('@openedx/paragon', () => ({
  ...jest.requireActual('@openedx/paragon'),
  useMediaQuery: jest.fn(),
}));
jest.mock('../../../../app/data', () => ({
  ...jest.requireActual('../../../../app/data'),
  useEnterpriseCustomer: jest.fn(),
}));

describe('Personalized Search usage events: port and adapter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useEnterpriseCustomer as jest.Mock).mockReturnValue({ data: { uuid: 'ent-uuid', slug: 'test-enterprise' } });
    (useMediaQuery as jest.Mock).mockReturnValue(true);
  });

  it('names the event and sends it for the enterprise in the properties', () => {
    trackPersonalizedSearchEvent('result_clicked', { enterprise_customer_uuid: 'ent-uuid', item_key: 'edX+C1' });
    expect(sendEnterpriseTrackEvent).toHaveBeenCalledWith(
      'ent-uuid',
      'edx.ui.enterprise.learner_portal.personalized_search.results.result_clicked',
      { enterprise_customer_uuid: 'ent-uuid', item_key: 'edX+C1' },
    );
    expect(PERSONALIZED_SEARCH_EVENTS.prompt_submitted)
      .toBe('edx.ui.enterprise.learner_portal.personalized_search.chat.prompt_submitted');
  });

  // The tab mounts only at ?tab=personalized-search, so the URL alone can't tell the entry points apart.
  it('reports nav_tab for a tab chosen in the dashboard tabs, and deep_link otherwise', () => {
    window.history.pushState({}, '', '/test-enterprise?tab=personalized-search');
    expect(getPortalEntryPoint()).toBe('deep_link');
    window.history.pushState(
      { usr: { dashboardTabSource: 'nav_tab' }, key: 'k1', idx: 1 },
      '',
      '/test-enterprise?tab=personalized-search',
    );
    expect(getPortalEntryPoint()).toBe('nav_tab');
  });

  // Back from a course page or a reload remounts the tab, which reads the mark again from this entry.
  it('keeps the nav_tab mark when the first reply puts ?session= in the URL', async () => {
    const user = userEvent.setup();
    window.history.pushState(
      { usr: { dashboardTabSource: 'nav_tab' }, key: 'k3', idx: 3 },
      '',
      '/test-enterprise?tab=personalized-search',
    );
    render(
      <IntlProvider locale="en">
        <BrowserRouter>
          <PersonalizedSearchTab
            store={createPersonalizedSearchStore()}
            transport={new FixtureChatTransport({ partDelayMs: 0 })}
          />
        </BrowserRouter>
      </IntlProvider>,
    );
    await user.click(screen.getByRole('button', { name: 'Prepare for a leadership role' }));
    await waitFor(() => expect(new URLSearchParams(window.location.search).get('session'))
      .toBe('00000000-0000-0000-0000-0000000a11ce'));
    expect(new URLSearchParams(window.location.search).get('tab')).toBe('personalized-search');
    expect(getPortalEntryPoint()).toBe('nav_tab');
  });

  const renderTab = () => render(
    <IntlProvider locale="en">
      <MemoryRouter>
        <PersonalizedSearchTab store={createPersonalizedSearchStore()} transport={new FixtureChatTransport()} />
      </MemoryRouter>
    </IntlProvider>,
  );

  it('a failing send is logged by the controller and doesn\'t break the tab', async () => {
    const blocked = new Error('blocked');
    (sendEnterpriseTrackEvent as jest.Mock).mockImplementationOnce(() => { throw blocked; });
    renderTab();
    await waitFor(() => expect(logError).toHaveBeenCalledWith(blocked));
  });

  it('sends tab_viewed once when the tab opens, with flat properties', async () => {
    window.history.pushState(
      { usr: { dashboardTabSource: 'nav_tab' }, key: 'k2', idx: 2 },
      '',
      '/test-enterprise?tab=personalized-search',
    );
    const { rerender } = renderTab();
    await waitFor(() => expect(sendEnterpriseTrackEvent).toHaveBeenCalledTimes(1));
    rerender(<IntlProvider locale="en"><MemoryRouter><div /></MemoryRouter></IntlProvider>);
    const [uuid, name, properties] = (sendEnterpriseTrackEvent as jest.Mock).mock.calls[0];
    expect((uuid as string)).toBe('ent-uuid');
    expect(name).toBe(PERSONALIZED_SEARCH_EVENTS.tab_viewed);
    expect(properties).toEqual({ enterprise_customer_uuid: 'ent-uuid', viewport: 'desktop', entry_point: 'nav_tab' });
    expectFlat(properties);
  });
});
