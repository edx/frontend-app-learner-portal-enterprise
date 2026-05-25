import PropTypes from 'prop-types';
import classNames from 'classnames';
import { Button, Hyperlink } from '@openedx/paragon';
import { defineMessages, useIntl } from '@edx/frontend-platform/i18n';

import { sendEnterpriseTrackEvent } from '@2uinc/frontend-enterprise-utils';
import dayjs from 'dayjs';
import { EXECUTIVE_EDUCATION_COURSE_MODES, useEnterpriseCustomer } from '../../../../app/data';

const messages = defineMessages({
  startCourse: {
    id: 'enterprise.learner_portal.dashboard.enrollments.course.start_course',
    defaultMessage: 'Start course',
    description: 'CTA text to start a course from the learner portal dashboard card.',
  },
  resumeCourse: {
    id: 'enterprise.learner_portal.dashboard.enrollments.course.resume_course',
    defaultMessage: 'Resume',
    description: 'CTA text to resume a course from the learner portal dashboard card.',
  },
  buttonSrOnlyText: {
    id: 'enterprise.learner_portal.dashboard.enrollments.course.continue_learning.sr_text',
    defaultMessage: 'for {title}',
    description: 'Screen reader suffix for course continue learning button label.',
  },
});

/**
 * A 'Continue Learning' button with parameters.
 *
 * @param {object} params Params.
 * @param {string} params.linkToCourse hyperlink to course on LMS.
 * @param {string} params.title course title.
 * @param {Function} params.courseRunId
 *
 * @returns {Function} A functional React component for the continue learning button.
 */
const ContinueLearningButton = ({
  variant,
  className,
  linkToCourse,
  title,
  courseRunId,
  startDate,
  mode,
  resumeCourseRunUrl,
}) => {
  const intl = useIntl();
  const { data: enterpriseCustomer } = useEnterpriseCustomer();

  const onClickHandler = () => {
    sendEnterpriseTrackEvent(
      enterpriseCustomer.uuid,
      'edx.ui.enterprise.learner_portal.dashboard.course.continued',
      {
        course_run_id: courseRunId,
      },
    );
  };

  const isCourseStarted = () => {
    if (!startDate) {
      return true;
    }

    const parsedStartDate = dayjs(startDate);
    if (!parsedStartDate.isValid()) {
      return true;
    }

    return parsedStartDate <= dayjs();
  };
  const isExecutiveEducation2UCourse = EXECUTIVE_EDUCATION_COURSE_MODES.includes(mode);
  const disabled = !isCourseStarted() ? 'disabled' : undefined;
  const defaultVariant = isExecutiveEducation2UCourse ? 'inverse-outline-primary' : 'outline-primary';

  const renderContent = () => {
    // resumeCourseRunUrl exists only when a learner has made progress.
    // If it is absent, always show "Start course", including when startDate is missing/invalid.
    if (!resumeCourseRunUrl) {
      return intl.formatMessage(messages.startCourse);
    }
    return intl.formatMessage(messages.resumeCourse);
  };

  return (
    <Button
      as={Hyperlink}
      destination={linkToCourse}
      className={classNames('btn-xs-block', disabled, className)}
      onClick={onClickHandler}
      variant={variant || defaultVariant}
    >
      {renderContent()}
      {' '}
      <span className="sr-only">{intl.formatMessage(messages.buttonSrOnlyText, { title })}</span>
    </Button>
  );
};

ContinueLearningButton.defaultProps = {
  className: undefined,
  variant: null,
  startDate: null,
  mode: null,
  resumeCourseRunUrl: null,
};

ContinueLearningButton.propTypes = {
  className: PropTypes.string,
  variant: PropTypes.string,
  linkToCourse: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  courseRunId: PropTypes.string.isRequired,
  startDate: PropTypes.string,
  mode: PropTypes.string,
  resumeCourseRunUrl: PropTypes.string,
};

export default ContinueLearningButton;
