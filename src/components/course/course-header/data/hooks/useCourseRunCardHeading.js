import dayjs from 'dayjs';
import { defineMessages, useIntl } from '@edx/frontend-platform/i18n';

import {
  getCourseEndDate,
  getCourseStartDate,
  hasTimeToComplete,
  isCourseSelfPaced,
  isWithinMinimumStartDateThreshold,
} from '../../../data/utils';
import { DATE_FORMAT } from '../constants';

const messages = defineMessages({
  courseStartDate: {
    id: 'useCourseRunCardHeading.startsOnDate',
    defaultMessage: 'Starts {startDate}',
    description: 'Heading for course run card when the course run is upcoming or the course run is self-paced.',
  },
  courseStartDateWithEndDate: {
    id: 'useCourseRunCardHeading.startsOnDateWithEndDate',
    defaultMessage: 'Starts {startDate} · Ends {endDate}',
    description: 'Heading for course run card when the course run is upcoming or self-paced, and its end date is known.',
  },
  courseStarted: {
    id: 'useCourseRunCardHeading.courseStarted',
    defaultMessage: 'Course started',
    description: 'Heading for course run card when course run is shown as already started, with no date shown.',
  },
  courseStartedWithEndDate: {
    id: 'useCourseRunCardHeading.courseStartedWithEndDate',
    defaultMessage: 'Course started · Ends {endDate}',
    description: 'Heading for course run card when course run is shown as already started, with its end date shown.',
  },
  courseStartedDate: {
    id: 'useCourseRunCardHeading.startedOnDate',
    defaultMessage: 'Started {startDate}',
    description: 'Heading for course run card when course run is shown as already started, with its start date shown.',
  },
  courseStartedDateWithEndDate: {
    id: 'useCourseRunCardHeading.startedOnDateWithEndDate',
    defaultMessage: 'Started {startDate} · Ends {endDate}',
    description: 'Heading for course run card when course run is shown as already started, with its start and end dates shown.',
  },
});

/**
 * Determines the heading to display on the course run card.
 * @param {object} args
 * @param {boolean} args.isCourseRunCurrent Whether the course run is current.
 * @param {object} args.courseRun Data about the course run for the course run card.
 * @param {boolean} args.isUserEnrolled Whether the user is already enrolled in the course run.
 * @returns {string} The heading to display on the course run card.
 */
const useCourseRunCardHeading = ({
  isCourseRunCurrent,
  courseRun,
  isUserEnrolled,
}) => {
  const intl = useIntl();

  const courseStartDate = getCourseStartDate({ courseRun });
  const courseEndDate = getCourseEndDate({ courseRun });
  const endDate = courseEndDate ? dayjs(courseEndDate).format(DATE_FORMAT) : null;

  const formatHeading = (withEndDateMessage, plainMessage, values = {}) => (
    endDate
      ? intl.formatMessage(withEndDateMessage, { ...values, endDate })
      : intl.formatMessage(plainMessage, values)
  );

  // check whether the course run is current based on its `availability` or whether
  // the start date is indeed in the past. As of this implementation, the `availability`
  // for published, enrollable externally hosted courses is always "Current" even if the
  // date is upcoming.
  if (isCourseRunCurrent && dayjs(courseStartDate).isBefore(dayjs())) {
    if (isUserEnrolled) {
      return formatHeading(messages.courseStartedWithEndDate, messages.courseStarted);
    }
    if (isCourseSelfPaced(courseRun.pacingType)) {
      if (hasTimeToComplete(courseRun) || isWithinMinimumStartDateThreshold(courseRun)) {
        // always today's date (incentives enrollment)
        return formatHeading(
          messages.courseStartDateWithEndDate,
          messages.courseStartDate,
          { startDate: dayjs().format(DATE_FORMAT) },
        );
      }
      return formatHeading(
        messages.courseStartedDateWithEndDate,
        messages.courseStartedDate,
        { startDate: dayjs(courseStartDate).format(DATE_FORMAT) },
      );
    }
    return formatHeading(
      messages.courseStartedDateWithEndDate,
      messages.courseStartedDate,
      { startDate: dayjs(courseStartDate).format(DATE_FORMAT) },
    );
  }
  return formatHeading(
    messages.courseStartDateWithEndDate,
    messages.courseStartDate,
    { startDate: dayjs(courseStartDate).format(DATE_FORMAT) },
  );
};

export default useCourseRunCardHeading;
