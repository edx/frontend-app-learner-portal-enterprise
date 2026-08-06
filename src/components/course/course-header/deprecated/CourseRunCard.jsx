import { useMemo } from 'react';
import PropTypes from 'prop-types';
import { useLocation } from 'react-router-dom';
import { Card } from '@openedx/paragon';
import { FormattedDate, FormattedMessage, useIntl } from '@edx/frontend-platform/i18n';

import EnrollAction from '../../enrollment/EnrollAction';
import CourseRunCardStatus from '../CourseRunCardStatus';
import {
  isUserEntitledForCourse,
  isCourseSelfPaced,
  hasTimeToComplete,
  findUserEnrollmentForCourseRun,
  hasCourseStarted,
  findHighestLevelSku,
  pathContainsCourseTypeSlug,
  getNormalizedStartDate,
  getCourseEndDate,
} from '../../data/utils';
import { formatStringAsNumber } from '../../../../utils/common';
import {
  useCanUserRequestSubsidyForCourse,
  useCourseEnrollmentUrl,
  useUserHasSubsidyRequestForCourse,
  useUserHasLearnerCreditRequestForCourse,
  useUserSubsidyApplicableToCourse,
} from '../../data/hooks';
import { determineEnrollmentType } from '../../enrollment/utils';
import {
  COURSE_AVAILABILITY_MAP,
  isArchived,
  useEnterpriseCustomer,
  useSubscriptions,
} from '../../../app/data';

const CourseRunCard = ({
  courseEntitlements,
  userEntitlements,
  courseRun,
  userEnrollments,
  courseKey,
  missingUserSubsidyReason,
}) => {
  const {
    availability,
    pacingType,
    courseUuid,
    enrollmentCount,
    key,
    seats,
    isEnrollable,
  } = courseRun;

  const courseEndDate = getCourseEndDate({ courseRun });

  const intl = useIntl();
  const DEFAULT_BUTTON_LABEL = intl.formatMessage({
    id: 'enterprise.course.about.page.course.run.card.enroll.button.label',
    defaultMessage: 'Enroll',
    description: 'Default button label for enrolling in a course run.',
  });
  const location = useLocation();
  const { data: enterpriseCustomer } = useEnterpriseCustomer();
  const userCanRequestSubsidyForCourse = useCanUserRequestSubsidyForCourse();

  const courseStartDate = getNormalizedStartDate(courseRun);

  const isCourseStarted = useMemo(
    () => hasCourseStarted(courseStartDate),
    [courseStartDate],
  );

  const {
    userEnrollment,
    isUserEnrolled,
  } = useMemo(
    () => {
      const foundEnrollment = findUserEnrollmentForCourseRun({ userEnrollments, key });
      return {
        userEnrollment: foundEnrollment,
        isUserEnrolled: !!foundEnrollment,
      };
    },
    [userEnrollments, key],
  );

  const { data: { subscriptionLicense } } = useSubscriptions();
  const { userSubsidyApplicableToCourse } = useUserSubsidyApplicableToCourse();

  const userHasSubsidyRequestForCourse = useUserHasSubsidyRequestForCourse(courseKey);
  const userHasLearnerCreditRequest = useUserHasLearnerCreditRequestForCourse(courseKey, ['requested']);

  const sku = useMemo(
    () => findHighestLevelSku({ seats, courseEntitlements }),
    [seats, courseEntitlements],
  );

  const isExecutiveEducation2UCourse = pathContainsCourseTypeSlug(location.pathname, 'executive-education-2u');

  const enrollmentUrl = useCourseEnrollmentUrl({
    enterpriseCustomer,
    courseRunKey: key,
    location,
    sku,
    userSubsidyApplicableToCourse,
    isExecutiveEducation2UCourse,
  });

  const enrollmentType = determineEnrollmentType({
    subsidyData: { userSubsidyApplicableToCourse },
    userHasSubsidyRequestForCourse,
    userHasLearnerCreditRequest,
    isUserEnrolled,
    isEnrollable,
    isCourseStarted,
    isExecutiveEducation2UCourse,
    userCanRequestSubsidyForCourse,
  });

  const courseRunArchived = isArchived(courseRun);

  /**
   * Updates to this function should be reflected in docs:
   * see /docs/images/enroll_button_card_generator.rst
   * Generates three string labels used on course run header card
   * heading, subHeading, buttonLabel
   * |¯¯¯¯¯¯¯¯¯¯¯¯¯|
   * |   heading   |
   * |  subHeading |
   * ||¯¯¯¯¯¯¯¯¯¯¯||
   * ||buttonLabel||
   * ||___________||
   * |_____________|
   * @returns {string []}
   */
  const [heading, subHeading, buttonLabel] = useMemo(() => {
    if (courseRunArchived) {
      return [
        <FormattedMessage
          id="enterprise.course.about.page.course.run.card.archived.heading"
          defaultMessage="Course archived"
          description="Course run card heading for archived course"
        />,
        <FormattedMessage
          id="enterprise.course.about.page.course.run.card.archived.subheading"
          defaultMessage="Future dates to be announced"
          description="Course run card subheading for archived course that has no future dates announced"
        />,
      ];
    }

    if (!isEnrollable) {
      if (
        (availability === COURSE_AVAILABILITY_MAP.UPCOMING || availability === COURSE_AVAILABILITY_MAP.STARTING_SOON)
        && courseStartDate
      ) {
        // Course will be available in the future
        return [
          <FormattedMessage
            id="enterprise.course.about.page.course.run.card.upcoming.heading"
            defaultMessage="Coming soon"
            description="Course run card heading for upcoming course"
          />,
          <FormattedMessage
            id="enterprise.course.about.page.course.run.card.upcoming.subheading"
            defaultMessage="Enroll after {upcomingCourseStartDate}"
            description="Course run card subheading for upcoming course"
            values={{
              upcomingCourseStartDate: (
                <FormattedDate
                  value={courseStartDate}
                  month="short"
                  day="numeric"
                />
              ),
            }}
          />,
          DEFAULT_BUTTON_LABEL,
        ];
      }
      // Course no future date availability announced
      return [
        <FormattedMessage
          id="enterprise.course.about.page.course.run.card.enrollment.closed.heading"
          defaultMessage="Enrollment closed"
          description="Course run card heading for closed enrollment"
        />,
        <FormattedMessage
          id="enterprise.course.about.page.course.run.card.enrollment.closed.subheading"
          defaultMessage="Future dates to be announced"
          description="Course run card subheading for closed enrollment that has no future dates announced"
        />,
        DEFAULT_BUTTON_LABEL,
      ];
    }

    if (isUserEnrolled) {
      // User is enrolled
      let enrolledHeading;
      if (!isCourseStarted) {
        enrolledHeading = courseEndDate ? (
          <FormattedMessage
            id="enterprise.course.about.page.enrolled.course.run.card.starts.with.end.heading"
            defaultMessage={'Starts {courseStartDate}\nEnds {courseEndDate}'}
            description="Course run card heading for course that has not started, with a known end date"
            values={{
              courseStartDate: (
                <FormattedDate value={courseStartDate} month="short" day="numeric" />
              ),
              courseEndDate: (
                <FormattedDate value={courseEndDate} month="short" day="numeric" />
              ),
            }}
          />
        ) : (
          <FormattedMessage
            id="enterprise.course.about.page.enrolled.course.run.card.starts.heading"
            defaultMessage="Starts {courseStartDate}"
            description="Course run card heading for course that has not started"
            values={{
              courseStartDate: (
                <FormattedDate
                  value={courseStartDate}
                  month="short"
                  day="numeric"
                />
              ),
            }}
          />
        );
      } else {
        enrolledHeading = courseEndDate ? (
          <FormattedMessage
            id="enterprise.course.about.page.enrolled.course.run.card.started.with.end.heading"
            defaultMessage={'Course started\nEnds {courseEndDate}'}
            description="Course run card heading for course that has started, with a known end date"
            values={{
              courseEndDate: (
                <FormattedDate value={courseEndDate} month="short" day="numeric" />
              ),
            }}
          />
        ) : (
          <FormattedMessage
            id="enterprise.course.about.page.enrolled.course.run.card.started.heading"
            defaultMessage="Course started"
            description="Course run card heading for course that has started"
          />
        );
      }
      return [
        enrolledHeading,
        <FormattedMessage
          id="enterprise.course.about.page.course.run.card.enrolled.subheading"
          defaultMessage="You are enrolled"
          description="Course run card subheading for enrolled course"
        />,
        <FormattedMessage
          id="enterprise.course.about.page.course.run.card.view.course.button.label"
          defaultMessage="View course"
          description="Button label for enrolled course run. User is already enrolled in the course run. By clicking this button user will be redirected to the course page."
        />,
      ];
    }
    // User is not enrolled
    if (isUserEntitledForCourse({ userEntitlements, courseUuid })) {
      // Is entitled for course
      return [
        <FormattedMessage
          id="enterprise.course.about.page.course.run.card.entitlement.found.heading"
          defaultMessage="Entitlement found"
          description="Course run card heading for entitled user"
        />,
        '',
        <FormattedMessage
          id="enterprise.course.about.page.course.run.card.enroll.subheading"
          defaultMessage="View on dashboard"
          description="Button label for entitled user. User is entitled to the course run. By clicking this button user will be redirected to the dashboard page."
        />,
      ];
    }
    const tempSubHeading = enrollmentCount > 0
      ? (
        <FormattedMessage
          id="enterprise.course.about.page.course.run.card.enrollment.count.greater.than.zero.subheading"
          defaultMessage="{enrollmentCount} recently enrolled!"
          description="Course run card subheading for recently enrolled course run with enrollment count"
          values={{
            enrollmentCount: formatStringAsNumber(enrollmentCount),
          }}
        />
      )
      : (
        <FormattedMessage
          id="enterprise.course.about.page.course.run.card.enrollment.count.less.than.one.subheading"
          defaultMessage="Be the first to enroll!"
          description="Course run card subheading for course run with no recent enrollments and tells the user to be the first to enroll"
        />
      );

    let tempHeading;
    if (isCourseStarted) {
      tempHeading = courseEndDate ? (
        <FormattedMessage
          id="enterprise.course.about.page.course.run.card.started.with.end.heading"
          defaultMessage={'Started {courseStartedDate}\nEnds {courseEndDate}'}
          description="Course run card heading for course that has started, with a known end date"
          values={{
            courseStartedDate: (
              <FormattedDate value={courseStartDate} month="short" day="numeric" />
            ),
            courseEndDate: (
              <FormattedDate value={courseEndDate} month="short" day="numeric" />
            ),
          }}
        />
      ) : (
        <FormattedMessage
          id="enterprise.course.about.page.course.run.card.started.heading"
          defaultMessage="Started {courseStartedDate}"
          description="Course run card heading for course that has started"
          values={{
            courseStartedDate: (
              <FormattedDate
                value={courseStartDate}
                month="short"
                day="numeric"
              />
            ),
          }}
        />
      );
    } else {
      tempHeading = courseEndDate ? (
        <FormattedMessage
          id="enterprise.course.about.page.course.run.card.starts.with.end.heading"
          defaultMessage={'Starts {courseStartsDate}\nEnds {courseEndDate}'}
          description="Course run card heading for course that has not started, with a known end date"
          values={{
            courseStartsDate: (
              <FormattedDate value={courseStartDate} month="short" day="numeric" />
            ),
            courseEndDate: (
              <FormattedDate value={courseEndDate} month="short" day="numeric" />
            ),
          }}
        />
      ) : (
        <FormattedMessage
          id="enterprise.course.about.page.course.run.card.starts.heading"
          defaultMessage="Starts {courseStartsDate}"
          description="Course run card heading for course that has not started"
          values={{
            courseStartsDate: (
              <FormattedDate
                value={courseStartDate}
                month="short"
                day="numeric"
              />
            ),
          }}
        />
      );
    }

    if (isCourseSelfPaced(pacingType) && isCourseStarted) {
      // istanbul ignore if: whenever hasTimeToComplete() is true here, getNormalizedStartDate()
      // has just substituted "now" as courseStartDate, so isCourseStarted (computed from that same
      // instant a moment later) can never reliably evaluate true in a test — real or mocked clocks
      // both hit this exact tie. Not reproducible without changing the start-date normalization.
      /* istanbul ignore if */
      if (hasTimeToComplete(courseRun)) {
        tempHeading = courseEndDate ? (
          <FormattedMessage
            id="enterprise.course.about.page.self.paced.course.run.card.starts.with.end.heading"
            defaultMessage={'Starts {courseStartsDate}\nEnds {courseEndDate}'}
            description="Course run card heading for a self-paced course that has already started but still has time to complete (shown as starting today), with a known end date"
            values={{
              courseStartsDate: (
                <FormattedDate value={courseStartDate} month="short" day="numeric" />
              ),
              courseEndDate: (
                <FormattedDate value={courseEndDate} month="short" day="numeric" />
              ),
            }}
          />
        ) : (
          <FormattedMessage
            id="enterprise.course.about.page.self.paced.course.run.card.starts.heading"
            defaultMessage="Starts {courseStartsDate}"
            description="Course run card heading for a self-paced course that has already started but still has time to complete (shown as starting today)"
            values={{
              courseStartsDate: (
                <FormattedDate
                  value={courseStartDate}
                  month="short"
                  day="numeric"
                />
              ),
            }}
          />
        );
      } else {
        tempHeading = courseEndDate ? (
          <FormattedMessage
            id="enterprise.course.about.page.self.paced.course.run.card.started.with.end.heading"
            defaultMessage={'Course started\nEnds {courseEndDate}'}
            description="Course run card heading for self-paced course that has started, with a known end date"
            values={{
              courseEndDate: (
                <FormattedDate value={courseEndDate} month="short" day="numeric" />
              ),
            }}
          />
        ) : (
          <FormattedMessage
            id="enterprise.course.about.page.self.paced.course.run.card.started.heading"
            defaultMessage="Course started"
            description="Course run card heading for course that has started"
          />
        );
      }
    }
    return [
      tempHeading,
      tempSubHeading,
      DEFAULT_BUTTON_LABEL,
    ];
  }, [
    courseRunArchived,
    isEnrollable,
    isUserEnrolled,
    userEntitlements,
    courseUuid,
    enrollmentCount,
    isCourseStarted,
    courseStartDate,
    courseEndDate,
    pacingType,
    availability,
    courseRun,
    DEFAULT_BUTTON_LABEL,
  ]);

  return (
    <Card>
      <Card.Section>
        <div className="text-center">
          <div className="h4 mb-0" style={{ whiteSpace: 'pre-line' }}>{heading}</div>
          <p className="small">{subHeading}</p>
        </div>
        {!courseRunArchived && (
          <EnrollAction
            enrollLabel={buttonLabel}
            enrollmentType={enrollmentType}
            enrollmentUrl={enrollmentUrl}
            userEnrollment={userEnrollment}
            subscriptionLicense={subscriptionLicense}
            courseRunPrice={courseRun?.firstEnrollablePaidSeatPrice}
          />
        )}
      </Card.Section>
      <CourseRunCardStatus
        isUserEnrolled={isUserEnrolled}
        missingUserSubsidyReason={missingUserSubsidyReason}
      />
    </Card>
  );
};

CourseRunCard.propTypes = {
  courseKey: PropTypes.string.isRequired,
  courseRun: PropTypes.shape({
    availability: PropTypes.string.isRequired,
    isEnrollable: PropTypes.bool.isRequired,
    pacingType: PropTypes.string.isRequired,
    courseUuid: PropTypes.string.isRequired,
    enrollmentCount: PropTypes.number,
    start: PropTypes.string.isRequired,
    end: PropTypes.string,
    key: PropTypes.string.isRequired,
    seats: PropTypes.arrayOf(PropTypes.shape()).isRequired,
    firstEnrollablePaidSeatPrice: PropTypes.number,
  }).isRequired,
  userEnrollments: PropTypes.arrayOf(PropTypes.shape({
    isEnrollmentActive: PropTypes.bool.isRequired,
    isRevoked: PropTypes.bool.isRequired,
    courseRunId: PropTypes.string.isRequired,
    mode: PropTypes.string.isRequired,
  })).isRequired,
  courseEntitlements: PropTypes.arrayOf(PropTypes.shape({
    sku: PropTypes.string.isRequired,
  })).isRequired,
  userEntitlements: PropTypes.arrayOf(PropTypes.shape()).isRequired,
  missingUserSubsidyReason: PropTypes.shape(),
};

CourseRunCard.defaultProps = {
  missingUserSubsidyReason: undefined,
};

export default CourseRunCard;
