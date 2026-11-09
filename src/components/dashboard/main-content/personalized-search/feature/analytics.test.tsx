import '@testing-library/jest-dom/extend-expect';
import { render, waitFor } from '@testing-library/react';
import { IntlProvider } from '@edx/frontend-platform/i18n';
import { useMediaQuery } from '@openedx/paragon';
import { MemoryRouter } from 'react-router-dom';
import { sendEnterpriseTrackEvent } from '@2uinc/frontend-enterprise-utils';

import PersonalizedSearchTab from '../adapters/portal/PortalPersonalizedSearchTab';
import { getPortalEntryPoint, trackPersonalizedSearchEvent } from '../adapters/portal/analytics';
import { PERSONALIZED_SEARCH_EVENTS } from '../../../../../eventTracking';
import { FixtureChatTransport } from '../core/transports/FixtureChatTransport';
import { createPersonalizedSearchStore } from './personalizedSearchStore';
import { useEnterpriseCustomer } from '../../../../app/data';

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

/** Every payload must be flat: primitives or arrays of primitives (the warehouse stores them as is). */
export const expectFlat = (properties: Record<string, unknown>) => {
  Object.entries(properties).forEach(([key, value]) => {
    const values = Array.isArray(value) ? value : [value];
    values.forEach((v) => {
      expect([null, 'string', 'number', 'boolean']).toContain(v === null ? null : typeof v);
    });
    expect(key).not.toMatch(/(^|_)(count|total|rate|cost|age)(_|$)/);
  });
};

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

  it('sends nothing without an enterprise and never throws', () => {
    trackPersonalizedSearchEvent('tab_viewed', {});
    expect(sendEnterpriseTrackEvent).not.toHaveBeenCalled();
    (sendEnterpriseTrackEvent as jest.Mock).mockImplementationOnce(() => { throw new Error('blocked'); });
    expect(() => trackPersonalizedSearchEvent('tab_viewed', { enterprise_customer_uuid: 'ent-uuid' })).not.toThrow();
  });

  it('reads the entry point from the URL', () => {
    window.history.pushState({}, '', '/test-enterprise?tab=personalized-search');
    expect(getPortalEntryPoint()).toBe('deep_link');
    window.history.pushState({}, '', '/test-enterprise');
    expect(getPortalEntryPoint()).toBe('nav_tab');
  });

  it('sends tab_viewed once when the tab opens, with flat properties', async () => {
    const view = () => render(
      <IntlProvider locale="en">
        <MemoryRouter>
          <PersonalizedSearchTab store={createPersonalizedSearchStore()} transport={new FixtureChatTransport()} />
        </MemoryRouter>
      </IntlProvider>,
    );
    const { rerender } = view();
    await waitFor(() => expect(sendEnterpriseTrackEvent).toHaveBeenCalledTimes(1));
    rerender(<IntlProvider locale="en"><MemoryRouter><div /></MemoryRouter></IntlProvider>);
    const [uuid, name, properties] = (sendEnterpriseTrackEvent as jest.Mock).mock.calls[0];
    expect((uuid as string)).toBe('ent-uuid');
    expect(name).toBe(PERSONALIZED_SEARCH_EVENTS.tab_viewed);
    expect(properties).toEqual({ enterprise_customer_uuid: 'ent-uuid', viewport: 'desktop', entry_point: 'nav_tab' });
    expectFlat(properties);
  });
});
