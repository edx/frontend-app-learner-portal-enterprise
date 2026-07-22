import '@testing-library/jest-dom/extend-expect';
import React from 'react';
import {
  act, render, screen, within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { IntlProvider } from '@edx/frontend-platform/i18n';
import { mergeConfig } from '@edx/frontend-platform';
import { getAuthenticatedUser } from '@edx/frontend-platform/auth';

import PathwayCoursesContainer from './PathwayCoursesContainer';
import { PathwaysActionBarProvider } from './action-bar';
import { usePathwaysStore } from './state';
import { useEnterpriseCourseEnrollments, useEnterpriseCustomer } from '../../../../app/data';
import { enterpriseCustomerFactory } from '../../../../app/data/services/data/__factories__';
import { queryClient } from '../../../../../utils/tests';
import {
  completedWithCertificateMatch,
  inProgressMatch,
  matchingTitleDifferentCourseKeyDecoy,
  sameRunIdDifferentCourseKeyDecoy,
} from './pathway-courses/tests/enrollmentFixtures';

jest.mock('../../../../app/data', () => ({
  ...jest.requireActual('../../../../app/data'),
  useEnterpriseCustomer: jest.fn(),
  useEnterpriseCourseEnrollments: jest.fn(),
}));

const mockEnterpriseCustomer = enterpriseCustomerFactory({
  slug: 'test-enterprise',
  contact_email: 'admin@example.com',
});

jest.mock('@edx/frontend-platform/auth');

const mockGetAuthenticatedUser = getAuthenticatedUser as jest.Mock;
const FEEDBACK_FORM_URL = 'https://docs.google.com/forms/d/e/mock-form/viewform';

const mockEnrollments = (enterpriseCourseEnrollments: unknown[]) => {
  (useEnterpriseCourseEnrollments as jest.Mock).mockReturnValue({
    data: { enterpriseCourseEnrollments, allEnrollmentsByStatus: {} },
  });
};

const renderComponent = (props = {}) => render(
  <QueryClientProvider client={queryClient()}>
    <MemoryRouter>
      <IntlProvider locale="en">
        <PathwaysActionBarProvider>
          <PathwayCoursesContainer {...props} />
        </PathwaysActionBarProvider>
      </IntlProvider>
    </MemoryRouter>
  </QueryClientProvider>,
);

describe('PathwayCoursesContainer', () => {
  beforeEach(() => {
    usePathwaysStore.getState().resetPathwaysState();
    (useEnterpriseCustomer as jest.Mock).mockReturnValue({ data: mockEnterpriseCustomer });
    mockEnrollments([]);
    mockGetAuthenticatedUser.mockReturnValue({ username: 'test-learner' });
    global.localStorage.clear();
    mergeConfig({ PATHWAYS_FEEDBACK_FORM_URL: FEEDBACK_FORM_URL });
  });

  it('renders the pathway courses scaffold using fixture data when the store has no courses', () => {
    renderComponent();

    expect(screen.getByTestId('pathway-container')).toBeInTheDocument();
    expect(screen.getByText('Introduction to Corporate Finance')).toBeInTheDocument();
    expect(screen.getByText('Financial Analysis & Evaluation')).toBeInTheDocument();
  });

  it('uses store courses instead of fixtures when the store is populated', () => {
    usePathwaysStore.setState({
      pathwayCourses: [
        { courseKey: 'custom-course', title: 'Custom Store Course', status: 'not_started' },
      ],
    });

    renderComponent();

    expect(screen.getByText('Custom Store Course')).toBeInTheDocument();
    expect(screen.queryByText('Introduction to Corporate Finance')).not.toBeInTheDocument();
  });

  it('registers the Rebuild pathway action-bar button', () => {
    renderComponent();

    expect(screen.getByTestId('pathway-rebuild-button')).toBeInTheDocument();
    expect(screen.getAllByText('Rebuild pathway')).toHaveLength(1);
  });

  it('calls onBackToProfile when Rebuild pathway is clicked', async () => {
    const user = userEvent.setup();
    const onBackToProfile = jest.fn();
    renderComponent({ onBackToProfile });

    await user.click(screen.getByTestId('pathway-rebuild-button'));

    expect(onBackToProfile).toHaveBeenCalledTimes(1);
  });

  it('resolves the course search link from the active enterprise slug', () => {
    renderComponent();

    const searchLink = screen.getByRole('link', { name: 'course search' });
    expect(searchLink).toHaveAttribute('href', '/test-enterprise/search');
  });

  it('uses the enterprise customer contact_email in the rendered admin link when available', () => {
    renderComponent();

    const adminLink = screen.getByRole('link', { name: /contact your organization's edX administrator/ });
    expect(adminLink).toHaveAttribute('href', expect.stringContaining('mailto:admin@example.com'));
  });

  it('falls back to the admin-user list when contact_email is unavailable', () => {
    (useEnterpriseCustomer as jest.Mock).mockReturnValue({
      data: enterpriseCustomerFactory({
        slug: 'test-enterprise',
        contact_email: '',
        admin_users: [{ email: 'fallback-admin@example.com' }],
      }),
    });

    renderComponent();

    const adminLink = screen.getByRole('link', { name: /contact your organization's edX administrator/ });
    expect(adminLink).toHaveAttribute('href', expect.stringContaining('mailto:fallback-admin@example.com'));
  });

  it('renders Rebuild pathway leading and Give feedback trailing (leftmost secondary) in the footer', () => {
    renderComponent();

    expect(screen.getByTestId('pathway-rebuild-button')).toBeInTheDocument();
    const feedbackLink = screen.getByTestId('pathway-feedback-button');
    expect(feedbackLink).toBeInTheDocument();
    expect(feedbackLink.tagName).toBe('A');
    expect(feedbackLink).toHaveAttribute('href', FEEDBACK_FORM_URL);
    expect(feedbackLink).toHaveAttribute('target', '_blank');
  });

  it('the feedback link points directly at the form and does not open a modal or navigate in-app', async () => {
    const user = userEvent.setup();
    const onBackToProfile = jest.fn();
    renderComponent({ onBackToProfile });

    await user.click(screen.getByTestId('pathway-feedback-button'));

    expect(screen.queryByText('Help us improve learning pathways!')).not.toBeInTheDocument();
    expect(onBackToProfile).not.toHaveBeenCalled();
  });

  it('hides the Give feedback link entirely when PATHWAYS_FEEDBACK_FORM_URL is not configured', () => {
    mergeConfig({ PATHWAYS_FEEDBACK_FORM_URL: null });
    renderComponent();

    expect(screen.queryByTestId('pathway-feedback-button')).not.toBeInTheDocument();
    expect(screen.getByTestId('pathway-rebuild-button')).toBeInTheDocument();
  });

  it('removes action-bar registration on unmount, as before', () => {
    const { unmount } = renderComponent();
    expect(screen.getByTestId('pathway-feedback-button')).toBeInTheDocument();
    unmount();
    expect(screen.queryByTestId('pathway-feedback-button')).not.toBeInTheDocument();
  });

  describe('automatic feedback prompt', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('auto-opens the blocking modal once at 15s and remains dismissable via Maybe later; footer link stays available', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      usePathwaysStore.setState({
        pathwayCourses: [
          { courseKey: 'custom-course', title: 'Custom Store Course', status: 'not_started' },
        ],
      });
      renderComponent();

      act(() => { jest.advanceTimersByTime(30000); });
      expect(screen.getByText('Help us improve learning pathways!')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Maybe later' }));
      expect(screen.queryByText('Help us improve learning pathways!')).not.toBeInTheDocument();
      expect(screen.getByTestId('pathway-feedback-button')).toBeInTheDocument();
    });

    it('never starts the timer or opens the modal when generation returns no canonical courses (fixture-only render)', () => {
      renderComponent();

      act(() => { jest.advanceTimersByTime(20000); });

      expect(screen.queryByText('Help us improve learning pathways!')).not.toBeInTheDocument();
    });

    it('never starts the timer when PATHWAYS_FEEDBACK_FORM_URL is not configured, even with real generated courses', () => {
      mergeConfig({ PATHWAYS_FEEDBACK_FORM_URL: null });
      usePathwaysStore.setState({
        pathwayCourses: [
          { courseKey: 'custom-course', title: 'Custom Store Course', status: 'not_started' },
        ],
      });
      renderComponent();

      act(() => { jest.advanceTimersByTime(20000); });

      expect(screen.queryByText('Help us improve learning pathways!')).not.toBeInTheDocument();
    });
  });

  describe('enrollment-derived course states', () => {
    beforeEach(() => {
      usePathwaysStore.setState({
        pathwayCourses: [
          { courseKey: 'corporate-finance', title: 'Introduction to Corporate Finance', status: 'not_started' },
          { courseKey: 'financial-analysis-evaluation', title: 'Financial Analysis & Evaluation', status: 'not_started' },
        ],
      });
    });

    const getRow = (title: string) => screen.getByText(title).closest('tr') as HTMLElement;

    it('renders every row as Not started with a View Course action when there are no enrollments', () => {
      renderComponent();

      expect(screen.getAllByText('Not started')).toHaveLength(2);
      expect(screen.getAllByRole('link', { name: /View Course/ })).toHaveLength(2);
      expect(screen.getByTestId('pathway-progress-upcoming')).toHaveTextContent('2');
    });

    it('flips only the matching row and progress to in_progress/Continue for an active enrollment', () => {
      mockEnrollments([inProgressMatch]);
      renderComponent();

      const financeRow = getRow('Introduction to Corporate Finance');
      expect(within(financeRow).getByText('In progress')).toBeInTheDocument();
      expect(within(financeRow).getByRole('link', { name: /Continue/ })).toHaveAttribute('href', inProgressMatch.linkToCourse);

      const otherRow = getRow('Financial Analysis & Evaluation');
      expect(within(otherRow).getByText('Not started')).toBeInTheDocument();

      expect(screen.getByTestId('pathway-progress-in-progress')).toHaveTextContent('1');
      expect(screen.getByTestId('pathway-progress-upcoming')).toHaveTextContent('1');
    });

    it('flips only the matching row and progress to completed/View Certificate for a completed enrollment', () => {
      mockEnrollments([completedWithCertificateMatch]);
      renderComponent();

      const financeRow = getRow('Financial Analysis & Evaluation');
      expect(within(financeRow).getByText('Completed')).toBeInTheDocument();
      expect(within(financeRow).getByRole('link', { name: /View Certificate/ }))
        .toHaveAttribute('href', completedWithCertificateMatch.linkToCertificate);

      const otherRow = getRow('Introduction to Corporate Finance');
      expect(within(otherRow).getByText('Not started')).toBeInTheDocument();

      expect(screen.getByTestId('pathway-progress-completed')).toHaveTextContent('1');
    });

    it('leaves all rows and progress unchanged when only unrelated enrollments exist', () => {
      mockEnrollments([sameRunIdDifferentCourseKeyDecoy, matchingTitleDifferentCourseKeyDecoy]);
      renderComponent();

      const table = screen.getByRole('table');
      expect(within(table).getAllByText('Not started')).toHaveLength(2);
      expect(screen.getByTestId('pathway-progress-upcoming')).toHaveTextContent('2');
      expect(within(table).queryByText('In progress')).not.toBeInTheDocument();
      expect(within(table).queryByText('Completed')).not.toBeInTheDocument();
    });

    it('keeps the progress card and the table in agreement', () => {
      mockEnrollments([inProgressMatch]);
      renderComponent();

      const table = screen.getByRole('table');
      const notStartedBadges = within(table).getAllByText('Not started').length;
      const inProgressBadges = within(table).getAllByText('In progress').length;
      expect(screen.getByTestId('pathway-progress-upcoming')).toHaveTextContent(String(notStartedBadges));
      expect(screen.getByTestId('pathway-progress-in-progress')).toHaveTextContent(String(inProgressBadges));
    });

    it('does not fabricate completion/progress from the fallback fixture stub', () => {
      usePathwaysStore.setState({ pathwayCourses: [] });
      renderComponent();

      expect(screen.getByTestId('pathway-progress-completed')).toHaveTextContent('0');
      expect(screen.getByTestId('pathway-progress-in-progress')).toHaveTextContent('0');
      expect(screen.getByTestId('pathway-progress-upcoming')).toHaveTextContent('5');
    });

    it('updates badges/actions/progress on rerender when the hook data changes, without writing to Zustand', () => {
      const before = usePathwaysStore.getState().pathwayCourses;
      const { rerender } = renderComponent();

      expect(screen.getByTestId('pathway-progress-completed')).toHaveTextContent('0');

      mockEnrollments([completedWithCertificateMatch]);
      rerender(
        <QueryClientProvider client={queryClient()}>
          <MemoryRouter>
            <IntlProvider locale="en">
              <PathwaysActionBarProvider>
                <PathwayCoursesContainer />
              </PathwaysActionBarProvider>
            </IntlProvider>
          </MemoryRouter>
        </QueryClientProvider>,
      );

      expect(screen.getByTestId('pathway-progress-completed')).toHaveTextContent('1');
      expect(usePathwaysStore.getState().pathwayCourses).toBe(before);
      expect(usePathwaysStore.getState().pathwayCourses).toEqual(before);
    });

    it('leaves stored pathwayCourses byte-for-byte unchanged after rendering enrollment-derived states', () => {
      const beforeRef = usePathwaysStore.getState().pathwayCourses;
      const beforePersisted = global.localStorage.getItem('edx.learner-pathways.state');

      mockEnrollments([completedWithCertificateMatch]);
      renderComponent();

      expect(screen.getByTestId('pathway-progress-completed')).toHaveTextContent('1');
      expect(usePathwaysStore.getState().pathwayCourses).toBe(beforeRef);
      expect(global.localStorage.getItem('edx.learner-pathways.state')).toBe(beforePersisted);
    });

    it('still renders the Need Help card, feedback link, rebuild action, and pathway page content alongside derived states', () => {
      mockEnrollments([completedWithCertificateMatch]);
      renderComponent();

      expect(screen.getByTestId('pathway-need-help')).toBeInTheDocument();
      expect(screen.getByTestId('pathway-feedback-button')).toBeInTheDocument();
      expect(screen.getByTestId('pathway-rebuild-button')).toBeInTheDocument();
      expect(screen.getByTestId('pathway-container')).toBeInTheDocument();
    });
  });
});
