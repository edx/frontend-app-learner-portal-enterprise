import '@testing-library/jest-dom/extend-expect';
import React from 'react';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntlProvider } from '@edx/frontend-platform/i18n';
import { mergeConfig } from '@edx/frontend-platform';
import { getAuthenticatedUser } from '@edx/frontend-platform/auth';

import PathwayCoursesContainer from './PathwayCoursesContainer';
import { PathwaysActionBarProvider } from './action-bar';
import { usePathwaysStore } from './state';

jest.mock('@edx/frontend-platform/auth');

const mockGetAuthenticatedUser = getAuthenticatedUser as jest.Mock;
const FEEDBACK_FORM_URL = 'https://docs.google.com/forms/d/e/mock-form/viewform';

const renderComponent = (props = {}) => render(
  <IntlProvider locale="en">
    <PathwaysActionBarProvider>
      <PathwayCoursesContainer {...props} />
    </PathwaysActionBarProvider>
  </IntlProvider>,
);

describe('PathwayCoursesContainer', () => {
  beforeEach(() => {
    usePathwaysStore.getState().resetPathwaysState();
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

  it('derives progress metrics from the displayed (fixture) courses', () => {
    renderComponent();

    expect(screen.getByTestId('pathway-progress-completed')).toHaveTextContent('1');
    expect(screen.getByTestId('pathway-progress-in-progress')).toHaveTextContent('1');
    expect(screen.getByTestId('pathway-progress-upcoming')).toHaveTextContent('3');
    expect(screen.getByTestId('pathway-progress-total')).toHaveTextContent('5');
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

      act(() => { jest.advanceTimersByTime(15000); });
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
});
