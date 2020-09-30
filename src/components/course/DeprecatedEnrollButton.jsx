import React, { useContext, useMemo } from 'react';
import classNames from 'classnames';
import moment from 'moment';
import qs from 'query-string';
import { Link, useLocation } from 'react-router-dom';
import { AppContext } from '@edx/frontend-platform/react';
import { Button } from '@edx/paragon';

import { UserSubsidyContext } from '../enterprise-user-subsidy';
import { CourseContext } from './CourseContextProvider';

import {
  COURSE_AVAILABILITY_MAP,
  ENROLL_BUTTON_LABEL_COMING_SOON,
  ENROLL_BUTTON_LABEL_NOT_AVAILABLE,
  ENROLLMENT_FAILED_QUERY_PARAM,
} from './data/constants';
import {
  hasCourseStarted,
  isUserEnrolledInCourse,
  isUserEntitledForCourse,
  isCourseSelfPaced,
  hasTimeToComplete,
  isArchived,
} from './data/utils';

/*
  The new enroll button is feature flagged. This component will be removed once new features are fully tested
  and the flag is removed.
*/

export default function EnrollButton() {
  const { state } = useContext(CourseContext);
  const { enterpriseConfig } = useContext(AppContext);
  const { subscriptionLicense } = useContext(UserSubsidyContext);
  const location = useLocation();
  const {
    activeCourseRun,
    userEnrollments,
    userEntitlements,
  } = state;
  const {
    availability,
    key,
    start,
    isEnrollable,
    pacingType,
    courseUuid,
  } = activeCourseRun;

  const enrollLinkClass = 'btn-success btn-block rounded-0 py-2';

  const isCourseStarted = useMemo(
    () => hasCourseStarted(start),
    [start],
  );

  const isUserEnrolled = useMemo(
    () => isUserEnrolledInCourse({ userEnrollments, key }),
    [userEnrollments, key],
  );

  const enrollmentUrl = useMemo(
    () => {
      if (subscriptionLicense) {
        const enrollmentFailedParams = { ...qs.parse(location.search) };
        enrollmentFailedParams[ENROLLMENT_FAILED_QUERY_PARAM] = true;
        const coursePageUrl = `${process.env.BASE_URL}${location.pathname}`;

        const enrollOptions = {
          license_uuid: subscriptionLicense.uuid,
          course_id: key,
          enterprise_customer_uuid: enterpriseConfig.uuid,
          next: `${process.env.LMS_BASE_URL}/courses/${key}/course`,
          // Redirect back to the same page with a failure query param
          failure_url: `${coursePageUrl}?${qs.stringify(enrollmentFailedParams)}`,
        };
        return `${process.env.LMS_BASE_URL}/enterprise/grant_data_sharing_permissions/?${qs.stringify(enrollOptions)}`;
      }

      // TODO: the "Enroll" button does not yet support other subsidy types beyond subscription
      // licenses. as such, the enrollment url for codes/offers is unknown at this time.
      return null;
    },
    [subscriptionLicense, enterpriseConfig, key],
  );

  // See https://openedx.atlassian.net/wiki/spaces/WS/pages/1045200922/Enroll+button+and+Course+Run+Selector+Logic
  // for more detailed documentation on the enroll button labeling based off course run states.
  const renderButtonLabel = () => {
    if (!isEnrollable) {
      const availabilityStates = [
        COURSE_AVAILABILITY_MAP.UPCOMING,
        COURSE_AVAILABILITY_MAP.STARTING_SOON,
      ];
      return availability in availabilityStates
        ? ENROLL_BUTTON_LABEL_COMING_SOON
        : ENROLL_BUTTON_LABEL_NOT_AVAILABLE;
    }
    if (!isUserEnrolled) {
      if (isUserEntitledForCourse({ userEntitlements, courseUuid })) {
        return <span className="enroll-btn-label">View on Dashboard</span>;
      }
      if (isCourseSelfPaced(pacingType)) {
        if (isCourseStarted && hasTimeToComplete(activeCourseRun) && !isArchived(activeCourseRun)) {
          return (
            <>
              <span className="enroll-btn-label">Enroll</span>
              <div><small>Starts {moment().format('MMM D, YYYY')}</small></div>
            </>
          );
        }
        return <span className="enroll-btn-label">Enroll</span>;
      }
      return (
        <>
          <span className="enroll-btn-label">Enroll</span>
          <div>
            <small>
              {isCourseStarted ? 'Started' : 'Starts'}
              {' '}
              {moment(start).format('MMM D, YYYY')}
            </small>
          </div>
        </>
      );
    }
    if (isUserEnrolled && !isCourseStarted) {
      return <span className="enroll-btn-label">You are Enrolled</span>;
    }
    return <span className="enroll-btn-label">View Course</span>;
  };

  const DefaultEnrollCta = useMemo(
    () => props => (
      <Button {...props}>
        {renderButtonLabel()}
      </Button>
    ),
    [],
  );

  const renderEnrollCta = () => {
    if (!isUserEnrolled && isEnrollable) {
      if (enrollmentUrl) {
        return (
          <a
            className={classNames('btn', enrollLinkClass)}
            href={enrollmentUrl}
          >
            {renderButtonLabel()}
          </a>
        );
      }
      return <DefaultEnrollCta className={classNames(enrollLinkClass, 'disabled')} />;
    }

    if (!isUserEnrolled && !isEnrollable) {
      return (
        <div className="alert alert-secondary text-center rounded-0">
          {renderButtonLabel()}
        </div>
      );
    }

    if (isUserEnrolled) {
      if (isCourseStarted) {
        return (
          <a
            className={classNames('btn', enrollLinkClass)}
            href={`${process.env.LMS_BASE_URL}/courses/${key}/info`}
          >
            {renderButtonLabel()}
          </a>
        );
      }

      return (
        <Link
          className={classNames('btn', enrollLinkClass)}
          to={`/${enterpriseConfig.slug}`}
        >
          {renderButtonLabel()}
        </Link>
      );
    }

    return <DefaultEnrollCta className={enrollLinkClass} />;
  };

  return (
    <div className="enroll-wrapper mb-3" style={{ width: 270 }}>
      {renderEnrollCta()}
    </div>
  );
}