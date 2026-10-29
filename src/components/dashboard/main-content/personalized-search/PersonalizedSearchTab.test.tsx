import '@testing-library/jest-dom/extend-expect';
import { render, screen, within } from '@testing-library/react';
import { IntlProvider } from '@edx/frontend-platform/i18n';
import { getAuthenticatedHttpClient } from '@edx/frontend-platform/auth';
import { useMediaQuery } from '@openedx/paragon';

import PersonalizedSearchTab from './PersonalizedSearchTab';
import { usePersonalizedSearchStore } from './state/personalizedSearchStore';
import { useEnterpriseCustomer } from '../../../app/data';

jest.mock('@openedx/paragon', () => ({
  ...jest.requireActual('@openedx/paragon'),
  useMediaQuery: jest.fn(),
}));
jest.mock('@edx/frontend-platform/auth', () => ({
  ...jest.requireActual('@edx/frontend-platform/auth'),
  getAuthenticatedHttpClient: jest.fn(),
}));
jest.mock('../../../app/data', () => ({
  ...jest.requireActual('../../../app/data'),
  useEnterpriseCustomer: jest.fn(),
}));

const renderTab = () => render(
  <IntlProvider locale="en">
    <PersonalizedSearchTab />
  </IntlProvider>,
);

describe('PersonalizedSearchTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    usePersonalizedSearchStore.getState().reset();
    (useEnterpriseCustomer as jest.Mock).mockReturnValue({ data: { uuid: 'ent-uuid', slug: 'test-enterprise' } });
    (useMediaQuery as jest.Mock).mockReturnValue(true);
  });

  it('shows the opening greeting, the four opening chips and the empty page, with no network request', () => {
    renderTab();
    const chat = screen.getByRole('region', { name: 'Chat' });
    expect(within(chat).getByText('Hi! What do you want to learn?')).toBeInTheDocument();
    expect(within(chat).getByText("I search your organization's catalog and build you a learning page.")).toBeInTheDocument();
    [
      'Prepare for a leadership role',
      'Learn AI for my job',
      'Build data skills',
      'Something quick, under 4 weeks',
    ].forEach((chip) => expect(within(chat).getByText(chip)).toBeInTheDocument());

    const page = screen.getByRole('region', { name: 'Your learning page' });
    expect(within(page).getByText(
      "Your learning page is empty. Tell me what you want to learn and I'll build it.",
    )).toBeInTheDocument();

    expect(getAuthenticatedHttpClient).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('uses the two-column layout at 768 px and above', () => {
    (useMediaQuery as jest.Mock).mockReturnValue(true);
    const { container } = renderTab();
    expect(useMediaQuery).toHaveBeenCalledWith({ minWidth: 768 });
    expect(container.querySelector('[data-layout="dual"]')).toBeInTheDocument();
    expect(container.querySelector('.personalized-search__chat-col')).toBeInTheDocument();
    expect(container.querySelector('.personalized-search__page-col')).toBeInTheDocument();
  });

  it('stacks the chat above the page below 768 px', () => {
    (useMediaQuery as jest.Mock).mockReturnValue(false);
    const { container } = renderTab();
    expect(container.querySelector('[data-layout="stacked"]')).toBeInTheDocument();
    expect(container.querySelector('.personalized-search__chat-col')).not.toBeInTheDocument();
    const regions = screen.getAllByRole('region').map((r) => r.getAttribute('aria-label'));
    expect(regions).toEqual(['Chat', 'Your learning page']);
  });

  it('shows only the not-available alert when the backend reports the feature unavailable', () => {
    usePersonalizedSearchStore.getState().setUnavailable(true);
    renderTab();
    expect(screen.getByText("Personalized Search isn't available right now")).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Chat' })).not.toBeInTheDocument();
  });
});
