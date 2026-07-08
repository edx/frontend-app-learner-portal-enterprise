import { screen } from '@testing-library/react';
import { AppContext } from '@edx/frontend-platform/react';
import { sendEnterpriseTrackEvent } from '@2uinc/frontend-enterprise-utils';
import { IntlProvider } from '@edx/frontend-platform/i18n';
import userEvent from '@testing-library/user-event';
import { useEnterpriseCustomer } from '../../app/data';
import VideoBanner from '../VideoBanner';
import { renderWithRouter } from '../../../utils/tests';
import '@testing-library/jest-dom/extend-expect';

jest.mock('../../app/data', () => ({
  useEnterpriseCustomer: jest.fn(),
}));
jest.mock('@2uinc/frontend-enterprise-utils', () => ({
  sendEnterpriseTrackEvent: jest.fn(),
}));

describe('VideoBanner', () => {
  const mockEnterpriseCustomer = {
    uuid: 'mock-uuid',
  };

  const mockAuthenticatedUser = {
    userId: 'test-user-id',
  };
  const VideoBannerWrapper = ({ onSeeWhatsNew = jest.fn() }) => (
    <IntlProvider locale="en">
      <AppContext.Provider value={{ authenticatedUser: mockAuthenticatedUser }}>
        <VideoBanner onSeeWhatsNew={onSeeWhatsNew} />
      </AppContext.Provider>
    </IntlProvider>
  );

  beforeEach(() => {
    jest.clearAllMocks();
    useEnterpriseCustomer.mockReturnValue({ data: mockEnterpriseCustomer });
  });

  it('renders the video banner with correct title and description', () => {
    renderWithRouter(<VideoBannerWrapper />);
    expect(screen.getByText('New!')).toBeInTheDocument();
    expect(screen.getByText('Just dropped')).toBeInTheDocument();
    expect(screen.getByText('Expand your skills with the latest courses and professional certificates.')).toBeInTheDocument();
  });

  it('renders the See what\'s new button', () => {
    renderWithRouter(<VideoBannerWrapper />);

    expect(screen.getByText("See what's new")).toBeInTheDocument();
  });

  it('calls sendEnterpriseTrackEvent when banner is rendered', () => {
    renderWithRouter(<VideoBannerWrapper />);
    expect(sendEnterpriseTrackEvent).toHaveBeenCalledWith(
      mockEnterpriseCustomer.uuid,
      'edx.ui.enterprise.learner_portal.latest_offerings_banner.viewed',
    );
  });

  it('calls sendEnterpriseTrackEvent and the CTA callback when clicked', async () => {
    const user = userEvent.setup();
    const onSeeWhatsNew = jest.fn();
    renderWithRouter(<VideoBannerWrapper onSeeWhatsNew={onSeeWhatsNew} />);

    const exploreVideosButton = screen.getByText("See what's new");
    await user.click(exploreVideosButton);

    expect(sendEnterpriseTrackEvent).toHaveBeenCalledWith(
      mockEnterpriseCustomer.uuid,
      'edx.ui.enterprise.learner_portal.latest_offerings_banner.see_whats_new_clicked',
    );
    expect(onSeeWhatsNew).toHaveBeenCalledTimes(1);
  });
});
