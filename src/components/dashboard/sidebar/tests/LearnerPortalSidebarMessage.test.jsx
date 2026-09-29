import '@testing-library/jest-dom/extend-expect';
import { screen, render } from '@testing-library/react';
import { IntlProvider } from '@edx/frontend-platform/i18n';

import LearnerPortalSidebarMessage from '../LearnerPortalSidebarMessage';
import { useEnterpriseCustomer } from '../../../app/data';
import { enterpriseCustomerFactory } from '../../../app/data/services/data/__factories__';

jest.mock('../../../app/data', () => ({
  ...jest.requireActual('../../../app/data'),
  useEnterpriseCustomer: jest.fn(),
}));

const mockEnterpriseCustomer = enterpriseCustomerFactory();

const LearnerPortalSidebarMessageWrapper = (props) => (
  <IntlProvider locale="en">
    <LearnerPortalSidebarMessage {...props} />
  </IntlProvider>
);

describe('<LearnerPortalSidebarMessage />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the custom sidebar message when enabled with content', () => {
    useEnterpriseCustomer.mockReturnValue({
      data: {
        ...mockEnterpriseCustomer,
        enableLearnerPortalSidebarMessage: true,
        learnerPortalSidebarContent: '<p>You are completing these courses through your learning pathway.</p>',
      },
    });
    render(<LearnerPortalSidebarMessageWrapper />);
    expect(screen.getByTestId('learner-portal-sidebar-message')).toBeInTheDocument();
    expect(screen.getByText('You are completing these courses through your learning pathway.')).toBeInTheDocument();
  });

  it('does not render when the feature is disabled', () => {
    useEnterpriseCustomer.mockReturnValue({
      data: {
        ...mockEnterpriseCustomer,
        enableLearnerPortalSidebarMessage: false,
        learnerPortalSidebarContent: '<p>Hidden message</p>',
      },
    });
    render(<LearnerPortalSidebarMessageWrapper />);
    expect(screen.queryByTestId('learner-portal-sidebar-message')).not.toBeInTheDocument();
  });

  it('does not render when there is no content', () => {
    useEnterpriseCustomer.mockReturnValue({
      data: {
        ...mockEnterpriseCustomer,
        enableLearnerPortalSidebarMessage: true,
        learnerPortalSidebarContent: null,
      },
    });
    render(<LearnerPortalSidebarMessageWrapper />);
    expect(screen.queryByTestId('learner-portal-sidebar-message')).not.toBeInTheDocument();
  });

  it('sanitizes the backend-provided HTML, stripping scripts and event handler attributes', () => {
    useEnterpriseCustomer.mockReturnValue({
      data: {
        ...mockEnterpriseCustomer,
        enableLearnerPortalSidebarMessage: true,
        learnerPortalSidebarContent: '<p onclick="alert(1)">Safe text</p><script>alert(1)</script><img src="x" onerror="alert(1)" />',
      },
    });
    render(<LearnerPortalSidebarMessageWrapper />);
    const message = screen.getByTestId('learner-portal-sidebar-message');
    expect(message).toHaveTextContent('Safe text');
    expect(message.querySelector('script')).not.toBeInTheDocument();
    expect(message.querySelector('[onclick]')).not.toBeInTheDocument();
    expect(message.querySelector('[onerror]')).not.toBeInTheDocument();
  });

  it('preserves target="_blank" CTA links and forces rel="noopener noreferrer" on them', () => {
    useEnterpriseCustomer.mockReturnValue({
      data: {
        ...mockEnterpriseCustomer,
        enableLearnerPortalSidebarMessage: true,
        learnerPortalSidebarContent: '<a href="https://example.com" target="_blank">Learn more</a>',
      },
    });
    render(<LearnerPortalSidebarMessageWrapper />);
    const link = screen.getByText('Learn more');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(link).toHaveAttribute('href', 'https://example.com');
  });

  it('forces rel="noopener noreferrer" even when the source HTML sets a different rel', () => {
    useEnterpriseCustomer.mockReturnValue({
      data: {
        ...mockEnterpriseCustomer,
        enableLearnerPortalSidebarMessage: true,
        learnerPortalSidebarContent: '<a href="https://example.com" target="_blank" rel="bogus">Learn more</a>',
      },
    });
    render(<LearnerPortalSidebarMessageWrapper />);
    expect(screen.getByText('Learn more')).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it.each(['_BLANK', ' _Blank ', '_new', 'someWindowName'])(
    'forces rel="noopener noreferrer" for target="%s", which also opens a new browsing context',
    (target) => {
      useEnterpriseCustomer.mockReturnValue({
        data: {
          ...mockEnterpriseCustomer,
          enableLearnerPortalSidebarMessage: true,
          learnerPortalSidebarContent: `<a href="https://example.com" target="${target}">Learn more</a>`,
        },
      });
      render(<LearnerPortalSidebarMessageWrapper />);
      expect(screen.getByText('Learn more')).toHaveAttribute('rel', 'noopener noreferrer');
    },
  );

  it.each(['_self', '_parent', '_TOP'])('does not add rel for same-context target="%s"', (target) => {
    useEnterpriseCustomer.mockReturnValue({
      data: {
        ...mockEnterpriseCustomer,
        enableLearnerPortalSidebarMessage: true,
        learnerPortalSidebarContent: `<a href="https://example.com" target="${target}">Learn more</a>`,
      },
    });
    render(<LearnerPortalSidebarMessageWrapper />);
    expect(screen.getByText('Learn more')).not.toHaveAttribute('rel');
  });

  it('does not add target/rel to links that do not open in a new tab', () => {
    useEnterpriseCustomer.mockReturnValue({
      data: {
        ...mockEnterpriseCustomer,
        enableLearnerPortalSidebarMessage: true,
        learnerPortalSidebarContent: '<a href="https://example.com">Learn more</a>',
      },
    });
    render(<LearnerPortalSidebarMessageWrapper />);
    const link = screen.getByText('Learn more');
    expect(link).not.toHaveAttribute('target');
    expect(link).not.toHaveAttribute('rel');
  });

  it('still strips iframes (not currently supported, unlike target="_blank" links)', () => {
    useEnterpriseCustomer.mockReturnValue({
      data: {
        ...mockEnterpriseCustomer,
        enableLearnerPortalSidebarMessage: true,
        learnerPortalSidebarContent: '<p>Safe text</p><iframe src="https://example.com"></iframe>',
      },
    });
    render(<LearnerPortalSidebarMessageWrapper />);
    const message = screen.getByTestId('learner-portal-sidebar-message');
    expect(message).toHaveTextContent('Safe text');
    expect(message.querySelector('iframe')).not.toBeInTheDocument();
  });

  it('defaults to the mb-3 className used by the desktop sidebar, and accepts an override', () => {
    useEnterpriseCustomer.mockReturnValue({
      data: {
        ...mockEnterpriseCustomer,
        enableLearnerPortalSidebarMessage: true,
        learnerPortalSidebarContent: '<p>Message</p>',
      },
    });
    const { rerender } = render(<LearnerPortalSidebarMessageWrapper />);
    expect(screen.getByTestId('learner-portal-sidebar-message')).toHaveClass('mb-3');

    rerender(<LearnerPortalSidebarMessageWrapper className="" />);
    expect(screen.getByTestId('learner-portal-sidebar-message')).not.toHaveClass('mb-3');
  });
});
