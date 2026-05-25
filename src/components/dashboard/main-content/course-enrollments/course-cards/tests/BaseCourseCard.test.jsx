import { AppContext } from '@edx/frontend-platform/react';
import { renderWithRouter, sendEnterpriseTrackEvent } from '@2uinc/frontend-enterprise-utils';
import { IntlProvider } from '@edx/frontend-platform/i18n';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MockDate from 'mockdate';
import '@testing-library/jest-dom/extend-expect';
import { QueryClientProvider } from '@tanstack/react-query';

import dayjs from '../../../../../../utils/dayjs';
import BaseCourseCard from '../BaseCourseCard';
import { ToastsContext } from '../../../../../Toasts';
import { useEnterpriseCustomer, useIsBFFEnabled } from '../../../../../app/data';

import { queryClient } from '../../../../../../utils/tests';
import {
  authenticatedUserFactory,
  enterpriseCustomerFactory,
} from '../../../../../app/data/services/data/__factories__';
import { isCourseEnded } from '../../../../../../utils/common';
import * as courseData from '../../../../../course/data';
import { COURSE_STATUSES } from '../../../../../../constants';
import { unenrollFromCourse } from '../unenroll/data';

const formatLocalizedDate = (date, locale = 'en') => new Intl.DateTimeFormat(locale, {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
}).format(new Date(date));

jest.mock('@2uinc/frontend-enterprise-utils', () => ({
  ...jest.requireActual('@2uinc/frontend-enterprise-utils'),
  sendEnterpriseTrackEvent: jest.fn(),
}));

jest.mock('../unenroll/data', () => ({
  ...jest.requireActual('../unenroll/data'),
  unenrollFromCourse: jest.fn(),
}));

jest.mock('../../../../../app/data', () => ({
  ...jest.requireActual('../../../../../app/data'),
  useEnterpriseCustomer: jest.fn(),
  useIsBFFEnabled: jest.fn(),
}));

jest.mock('../../../../../course/data', () => {
  const actualCourseData = jest.requireActual('../../../../../course/data');
  return {
    ...actualCourseData,
    getNormalizedStartDate: jest.fn(actualCourseData.getNormalizedStartDate),
  };
});

const mockAddToast = jest.fn();

const mockEnterpriseCustomer = enterpriseCustomerFactory();
const mockAuthenticatedUser = authenticatedUserFactory();

const BaseCourseCardWrapper = (props) => (
  <QueryClientProvider client={queryClient()}>
    <IntlProvider locale="en">
      <AppContext.Provider value={{ authenticatedUser: mockAuthenticatedUser }}>
        <ToastsContext.Provider value={{ addToast: mockAddToast }}>
          <BaseCourseCard {...props} />
        </ToastsContext.Provider>
      </AppContext.Provider>
    </IntlProvider>
  </QueryClientProvider>
);

describe('<BaseCourseCard />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useEnterpriseCustomer.mockReturnValue({ data: mockEnterpriseCustomer });
    useIsBFFEnabled.mockReturnValue(false);
  });

  afterEach(() => {
    MockDate.reset();
  });

  describe('email settings modal', () => {
    beforeEach(async () => {
      const user = userEvent.setup();
      renderWithRouter((
        <BaseCourseCardWrapper
          type={COURSE_STATUSES.completed}
          title="edX Demonstration Course"
          linkToCourse="https://edx.org"
          courseRunId="my+course+key"
          mode="verified"
          hasEmailsEnabled
        />
      ));
      // open email settings modal
      await user.click(screen.getByLabelText('course settings for edX Demonstration Course'));
      expect(await screen.findByRole('menuitem')).toBeInTheDocument();
      await user.click(screen.getByRole('menuitem'));
      expect(await screen.findByRole('dialog')).toBeInTheDocument();
    });

    it('handles email settings modal close/cancel', async () => {
      const user = userEvent.setup();
      await user.click(screen.getByTestId('email-setting-modal-close-btn', { name: 'Close' }));
      expect(await screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('unenroll modal', () => {
    beforeEach(async () => {
      jest.clearAllMocks();
      const user = userEvent.setup();
      renderWithRouter(
        <BaseCourseCardWrapper
          type={COURSE_STATUSES.inProgress}
          title="edX Demonstration Course"
          linkToCourse="https://edx.org"
          courseRunId="my+course+key"
          mode="verified"
          canUnenroll
        />,
      );
      // open unenroll modal
      await user.click(screen.getByLabelText('course settings for edX Demonstration Course'));
      expect(await screen.findByRole('menuitem')).toBeInTheDocument();
      await user.click(screen.getByRole('menuitem'));
      expect(await screen.findByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Unenroll from course?')).toBeInTheDocument();
    });

    it('handles unenroll modal close/cancel', async () => {
      const user = userEvent.setup();

      // Option 1: Use case-insensitive regex
      const cancelButton = screen.getByRole('button', { name: /keep learning/i });
      await user.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    it('handles unenroll modal success', async () => {
      const user = userEvent.setup();
      unenrollFromCourse.mockResolvedValueOnce({});

      const unenrollButton = screen.getByRole('button', { name: /^Unenroll$/ });
      await user.click(unenrollButton);

      await waitFor(() => {
        expect(sendEnterpriseTrackEvent).toHaveBeenCalledWith(
          mockEnterpriseCustomer.uuid,
          'edx.ui.enterprise.learner_portal.dashboard.enrollments.course.unenroll_modal.unenrolled',
          { course_run_id: 'my+course+key' },
        );
      });
    });
  });

  it('should render Skeleton if isLoading = true', () => {
    renderWithRouter(
      <BaseCourseCardWrapper
        type={COURSE_STATUSES.completed}
        title="edX Demonstration Course"
        linkToCourse="https://edx.org"
        courseRunId="my+course+key"
        mode="verified"
        hasEmailsEnabled
        isLoading
      />,
    );
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders course title as plain text for upcoming status', () => {
    renderWithRouter(
      <BaseCourseCardWrapper
        type={COURSE_STATUSES.upcoming}
        title="edX Demonstration Course"
        linkToCourse="https://edx.org"
        courseRunId="my+course+key"
        mode="verified"
        hasEmailsEnabled
      />,
    );

    expect(screen.getByText('edX Demonstration Course')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'edX Demonstration Course' })).not.toBeInTheDocument();
  });

  it('renders internal link for course title when externalCourseLink is false', () => {
    renderWithRouter(
      <BaseCourseCardWrapper
        type={COURSE_STATUSES.inProgress}
        title="edX Demonstration Course"
        linkToCourse="/test-enterprise/course/course-v1:test+run"
        courseRunId="my+course+key"
        mode="verified"
        hasEmailsEnabled
        externalCourseLink={false}
      />,
    );

    const courseTitleLink = screen.getByRole('link', { name: 'edX Demonstration Course' });
    expect(courseTitleLink).toHaveAttribute('href', '/test-enterprise/course/course-v1:test+run');
  });

  it('renders custom dropdown menu item when provided', async () => {
    const user = userEvent.setup();
    const customMenuAction = jest.fn();

    renderWithRouter(
      <BaseCourseCardWrapper
        type={COURSE_STATUSES.inProgress}
        title="edX Demonstration Course"
        linkToCourse="https://edx.org"
        courseRunId="my+course+key"
        mode="verified"
        hasEmailsEnabled
        dropdownMenuItems={[
          {
            key: 'custom-action',
            type: 'button',
            onClick: customMenuAction,
            children: <div role="menuitem">Custom action</div>,
          },
        ]}
      />,
    );

    await user.click(screen.getByLabelText('course settings for edX Demonstration Course'));
    const customActionItem = await screen.findByRole('menuitem', { name: 'Custom action' });
    await user.click(customActionItem);

    expect(customMenuAction).toHaveBeenCalledTimes(1);
  });

  it.each([{
    startDate: dayjs().toISOString(),
    endDate: dayjs().add(5, 'days').toISOString(),
    isStarted: false,
  }, {
    startDate: dayjs().subtract(1, 'day').toISOString(),
    endDate: dayjs().add(5, 'days').toISOString(),
    isStarted: true,
  }, {
    startDate: dayjs().add(1, 'day').toISOString(),
    endDate: dayjs().add(5, 'days').toISOString(),
    isStarted: false,
  }])('renders with different startDate values (%s)', ({ startDate, endDate, isStarted }) => {
    const courseStartDate = courseData.getNormalizedStartDate({
      start: startDate,
      end: endDate,
      pacingType: 'self',
      weeksToComplete: null,
    });
    renderWithRouter(
      <BaseCourseCardWrapper
        type={COURSE_STATUSES.inProgress}
        title="edX Demonstration Course"
        linkToCourse="https://edx.org"
        courseRunId="my+course+key"
        hasEmailsEnabled
        courseType="executive-education-2u"
        productSource="2u"
        mode="executive-education"
        startDate={startDate}
        endDate={endDate}
        orgName="some_name"
        pacing="self"
      />,
    );
    if (isStarted) {
      expect(screen.queryByText(`Starts ${formatLocalizedDate(courseStartDate)}`)).not.toBeInTheDocument();
    } else {
      expect(screen.getByText(`Starts ${formatLocalizedDate(courseStartDate)}`)).toBeInTheDocument();
    }
  });

  it.each([{
    startDate: dayjs().subtract(10, 'days').toISOString(),
    endDate: dayjs().add(10, 'days').toISOString(),
    pacing: 'self',
  }, {
    startDate: dayjs().subtract(25, 'day').toISOString(),
    endDate: dayjs().subtract(1, 'days').toISOString(),
    pacing: 'self',
  }, {
    startDate: dayjs().subtract(10, 'days').toISOString(),
    endDate: dayjs().add(10, 'days').toISOString(),
    pacing: 'instructor',
  }, {
    startDate: dayjs().subtract(25, 'day').toISOString(),
    endDate: dayjs().subtract(1, 'days').toISOString(),
    pacing: 'instructor',
  }])('renders with different tense values for pacing (%s)', ({ pacing, startDate, endDate }) => {
    const courseHasEnded = isCourseEnded(endDate);
    renderWithRouter(
      <BaseCourseCardWrapper
        type={COURSE_STATUSES.inProgress}
        title="edX Demonstration Course"
        linkToCourse="https://edx.org"
        courseRunId="my+course+key"
        hasEmailsEnabled
        courseType="executive-education-2u"
        productSource="2u"
        mode="executive-education"
        startDate={startDate}
        endDate={endDate}
        orgName="some_name"
        pacing={pacing}
      />,
    );
    expect(screen.getByTestId('course-pacing-help-link')).toBeInTheDocument();
    expect(screen.getByText(`${pacing}-paced`)).toBeInTheDocument();

    if (courseHasEnded) {
      expect(screen.getByText('This course was', { exact: false })).toBeInTheDocument();
    } else {
      expect(screen.getByText('This course is', { exact: false })).toBeInTheDocument();
    }
  });

  it.each([
    {
      type: COURSE_STATUSES.inProgress,
      shouldRenderEndDate: true,
    },
    {
      type: COURSE_STATUSES.completed,
      shouldRenderEndDate: false,
    },
  ])('renders endDate based on the course state', ({ type, shouldRenderEndDate }) => {
    const startDate = dayjs().subtract(7, 'days').toISOString();
    const endDate = dayjs().add(7, 'days').toISOString();
    const formattedEndDate = formatLocalizedDate(endDate);
    renderWithRouter(
      <BaseCourseCardWrapper
        type={type}
        title="edX Demonstration Course"
        linkToCourse="https://edx.org"
        courseRunId="my+course+key"
        hasEmailsEnabled
        startDate={startDate}
        endDate={endDate}
        mode="executive-education"
        orgName="some_name"
        pacing="instructor"
      />,
    );
    if (shouldRenderEndDate) {
      expect(screen.getByText(`Ends ${formattedEndDate}`)).toBeInTheDocument();
    } else {
      expect(screen.queryByText(`Ends ${formattedEndDate}`)).not.toBeInTheDocument();
    }
  });

  it('renders standard course type label when not executive education', () => {
    renderWithRouter(
      <BaseCourseCardWrapper
        type={COURSE_STATUSES.inProgress}
        title="edX Demonstration Course"
        linkToCourse="https://edx.org"
        courseRunId="my+course+key"
        hasEmailsEnabled
        mode="verified"
        orgName="some_name"
      />,
    );

    expect(screen.getByText('some_name • Course')).toBeInTheDocument();
  });

  it('renders standard course type tooltip text when not executive education', async () => {
    const user = userEvent.setup();
    renderWithRouter(
      <BaseCourseCardWrapper
        type={COURSE_STATUSES.inProgress}
        title="edX Demonstration Course"
        linkToCourse="https://edx.org"
        courseRunId="my+course+key"
        hasEmailsEnabled
        mode="verified"
        orgName="some_name"
      />,
    );

    await user.click(screen.getByLabelText('More information about course type'));
    expect(await screen.findByText('Courses are on-demand, self-paced, and include asynchronous online discussion.')).toBeInTheDocument();
  });

  it('does not render end date label when endDate is missing (even after course has started)', () => {
    const startedStartDate = dayjs().subtract(1, 'day').toISOString();

    renderWithRouter(
      <BaseCourseCardWrapper
        type={COURSE_STATUSES.inProgress}
        title="edX Demonstration Course"
        linkToCourse="https://edx.org"
        courseRunId="my+course+key"
        hasEmailsEnabled
        mode="verified"
        orgName="some_name"
        startDate={startedStartDate}
        endDate={null}
        pacing="self"
      />,
    );

    expect(screen.queryByText(/^Ends /)).not.toBeInTheDocument();
  });

  it('does not render start date label when normalized start date is null', () => {
    courseData.getNormalizedStartDate.mockReturnValueOnce(null);

    renderWithRouter(
      <BaseCourseCardWrapper
        type={COURSE_STATUSES.inProgress}
        title="edX Demonstration Course"
        linkToCourse="https://edx.org"
        courseRunId="my+course+key"
        hasEmailsEnabled
        mode="verified"
        orgName="some_name"
        startDate={dayjs().add(1, 'day').toISOString()}
        endDate={dayjs().add(5, 'days').toISOString()}
        pacing="self"
      />,
    );

    expect(screen.queryByText(/^Starts /)).not.toBeInTheDocument();
  });

  it('renders learner credit requested helper text for lcRequested status', () => {
    renderWithRouter(
      <BaseCourseCardWrapper
        type={COURSE_STATUSES.lcRequested}
        title="edX Demonstration Course"
        linkToCourse="https://edx.org"
        courseRunId="my+course+key"
        mode="verified"
        hasEmailsEnabled
      />,
    );

    expect(screen.getByText('Please allow 5-10 business days for review. If approved by your edX administrator, you will be able to enroll.')).toBeInTheDocument();
  });

  it('renders requested helper text for requested status', () => {
    renderWithRouter(
      <BaseCourseCardWrapper
        type={COURSE_STATUSES.requested}
        title="edX Demonstration Course"
        linkToCourse="https://edx.org"
        courseRunId="my+course+key"
        mode="verified"
        hasEmailsEnabled
      />,
    );

    expect(screen.getByText('Please allow 5-10 business days for review. If approved, you will receive an email to get started.')).toBeInTheDocument();
  });

  it('renders micromasters title when provided', () => {
    renderWithRouter(
      <BaseCourseCardWrapper
        type={COURSE_STATUSES.inProgress}
        title="edX Demonstration Course"
        linkToCourse="https://edx.org"
        courseRunId="my+course+key"
        mode="verified"
        hasEmailsEnabled
        micromastersTitle="MicroMasters Program"
      />,
    );

    expect(screen.getByText('MicroMasters Program')).toBeInTheDocument();
  });

  it('renders course upgrade price element when provided', () => {
    renderWithRouter(
      <BaseCourseCardWrapper
        type={COURSE_STATUSES.inProgress}
        title="edX Demonstration Course"
        linkToCourse="https://edx.org"
        courseRunId="my+course+key"
        mode="verified"
        hasEmailsEnabled
        courseUpgradePrice={<div>Upgrade for $99</div>}
      />,
    );

    expect(screen.getByText('Upgrade for $99')).toBeInTheDocument();
  });

  it.each([
    {
      enrollByDate: '2024-06-15T14:00:00Z',
      courseRunStatus: COURSE_STATUSES.assigned,
      expectedEnrollByDateFormat: 'h:mma MMMM Do, YYYY',
      currentTimestamp: '2024-06-10T14:00:00Z',
      hasExpiringWarningTooltip: true,
    },
    {
      enrollByDate: '2024-06-10T14:00:00Z',
      courseRunStatus: COURSE_STATUSES.assigned,
      expectedEnrollByDateFormat: 'h:mma MMMM Do, YYYY',
      currentTimestamp: null,
      hasExpiringWarningTooltip: false,
    },
    {
      enrollByDate: '2024-06-10T00:00:00Z',
      courseRunStatus: COURSE_STATUSES.assigned,
      expectedEnrollByDateFormat: 'MMMM Do, YYYY', // parsed time is midnight; should NOT show time
      currentTimestamp: null,
      hasExpiringWarningTooltip: false,
    },
    {
      enrollByDate: dayjs().add(5, 'days').toISOString(),
      courseRunStatus: COURSE_STATUSES.inProgress,
      expectedEnrollByDateFormat: null,
      currentTimestamp: null,
      hasExpiringWarningTooltip: false,
    },
  ])('renders "Enroll By" date for assigned course cards (%s)', async ({
    enrollByDate,
    courseRunStatus,
    expectedEnrollByDateFormat,
    currentTimestamp,
    hasExpiringWarningTooltip,
  }) => {
    const user = userEvent.setup();
    if (currentTimestamp) {
      MockDate.set(currentTimestamp);
    }
    renderWithRouter(
      <BaseCourseCardWrapper
        type={courseRunStatus}
        courseRunStatus={courseRunStatus}
        title="edX Demonstration Course"
        linkToCourse="https://edx.org"
        courseRunId="my+course+key"
        mode="verified"
        hasEmailsEnabled
        enrollBy={enrollByDate}
      />,
    );

    if (expectedEnrollByDateFormat) {
      const expectedFormattedEnrollByDate = dayjs(enrollByDate).format(expectedEnrollByDateFormat);
      expect(screen.getByText(`Enroll by ${expectedFormattedEnrollByDate}`)).toBeInTheDocument();
    } else {
      expect(screen.queryByText('Enroll by')).not.toBeInTheDocument();
    }

    const expectedExpiringWarningAlt = 'Learn more about enrollment deadline for edX Demonstration Course';
    if (hasExpiringWarningTooltip) {
      const expiringWarningIconButton = screen.getByLabelText(expectedExpiringWarningAlt);
      await user.click(expiringWarningIconButton);
      expect(await screen.findByText('Enrollment deadline approaching')).toBeInTheDocument();
    } else {
      const expiringWarningIconButton = screen.queryByLabelText(expectedExpiringWarningAlt);
      expect(expiringWarningIconButton).not.toBeInTheDocument();
    }
  });

  it('renders custom buttons row when buttons prop is provided', () => {
    renderWithRouter(
      <BaseCourseCardWrapper
        type={COURSE_STATUSES.inProgress}
        title="edX Demonstration Course"
        linkToCourse="https://edx.org"
        courseRunId="my+course+key"
        mode="verified"
        hasEmailsEnabled
        buttons={<button type="button">Custom action</button>}
      />,
    );

    expect(screen.getByRole('button', { name: 'Custom action' })).toBeInTheDocument();
  });

  it('renders miscText prop when provided', () => {
    renderWithRouter(
      <BaseCourseCardWrapper
        type={COURSE_STATUSES.inProgress}
        title="edX Demonstration Course"
        linkToCourse="https://edx.org"
        courseRunId="my+course+key"
        mode="verified"
        hasEmailsEnabled
        miscText={<span>Custom misc text override</span>}
      />,
    );

    expect(screen.getByText('Custom misc text override')).toBeInTheDocument();
  });

  it('renders canceled assignment alert message', () => {
    renderWithRouter(
      <BaseCourseCardWrapper
        type={COURSE_STATUSES.assigned}
        title="edX Demonstration Course"
        linkToCourse="https://edx.org"
        courseRunId="my+course+key"
        mode="verified"
        hasEmailsEnabled
        isCanceledAssignment
      />,
    );

    expect(screen.getByText('Your learning administrator canceled this assignment')).toBeInTheDocument();
  });

  it('renders assigned badge when isCourseAssigned is true', () => {
    renderWithRouter(
      <BaseCourseCardWrapper
        type={COURSE_STATUSES.inProgress}
        title="edX Demonstration Course"
        linkToCourse="https://edx.org"
        courseRunId="my+course+key"
        mode="verified"
        hasEmailsEnabled
        isCourseAssigned
      />,
    );

    expect(screen.getByText('Assigned')).toBeInTheDocument();
  });

  it('renders expired assignment alert message', () => {
    renderWithRouter(
      <BaseCourseCardWrapper
        type={COURSE_STATUSES.assigned}
        title="edX Demonstration Course"
        linkToCourse="https://edx.org"
        courseRunId="my+course+key"
        mode="verified"
        hasEmailsEnabled
        isExpiredAssignment
      />,
    );

    expect(screen.getByText('Deadline to enroll in this course has passed')).toBeInTheDocument();
  });
});
