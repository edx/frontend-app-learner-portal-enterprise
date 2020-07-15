import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { faExclamationTriangle, faCheckCircle } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { StatusAlert } from '@edx/paragon';
import { AppContext } from '@edx/frontend-platform/react';

import { LoadingSpinner } from '../../../loading-spinner';
import CourseSection from './CourseSection';
import {
  InProgressCourseCard,
  UpcomingCourseCard,
  CompletedCourseCard,
  SavedForLaterCourseCard,
} from './course-cards';

import * as selectors from './data/selectors';
import * as actions from './data/actions';

const SAVED_FOR_LATER_COURSES_SECTION_SUBTITLE = `This section contains both the courses you have completed
  in the past and courses that have been voluntarily removed from your "In Progress" list.`;

export class CourseEnrollments extends Component {
  componentDidMount() {
    const {
      enterpriseConfig: {
        uuid,
      },
    } = this.context;
    const { fetchCourseEnrollments } = this.props;
    const options = {};
    if (uuid) {
      options.uuid = uuid;
    }
    fetchCourseEnrollments(options);
  }

  componentWillUnmount() {
    const { clearCourseEnrollments } = this.props;
    clearCourseEnrollments();
  }

  hasCourseRunsWithStatus = (status) => {
    const { courseRuns } = this.props;
    return courseRuns && courseRuns[status] && courseRuns[status].length > 0;
  }

  hasCourseRuns = () => (
    this.hasCourseRunsWithStatus('completed')
    || this.hasCourseRunsWithStatus('in_progress')
    || this.hasCourseRunsWithStatus('upcoming')
    || this.hasCourseRunsWithStatus('savedForLater')
  )

  renderError = () => (
    <StatusAlert
      alertType="danger"
      dialog={(
        <div className="d-flex">
          <div>
            <FontAwesomeIcon className="mr-2" icon={faExclamationTriangle} />
          </div>
          <div>
            An error occurred while retrieving your course enrollments. Please try again.
          </div>
        </div>
      )}
      dismissible={false}
      open
    />
  );

  renderMarkCourseCompleteSuccessAlert = () => {
    const { modifyIsMarkCourseCompleteSuccess } = this.props;
    return (
      <StatusAlert
        alertType="success"
        dialog={(
          <div className="d-flex">
            <div>
              <FontAwesomeIcon className="mr-2" icon={faCheckCircle} />
            </div>
            <div>
              Your course was saved for later.
            </div>
          </div>
        )}
        onClose={() => {
          modifyIsMarkCourseCompleteSuccess({ isSuccess: false });
        }}
        open
      />
    );
  };

  renderMoveToInProgressCourseSuccessAlert = () => {
    const { modifyIsMoveToInProgressCourseSuccess } = this.props;
    return (
      <StatusAlert
        alertType="success"
        dialog={(
          <div className="d-flex">
            <div>
              <FontAwesomeIcon className="mr-2" icon={faCheckCircle} />
            </div>
            <div>
              Your course was moved to In Progress.
            </div>
          </div>
        )}
        onClose={() => {
          modifyIsMoveToInProgressCourseSuccess({ isSuccess: false });
        }}
        open
      />
    );
  };

  render() {
    const {
      children,
      courseRuns,
      isLoading,
      error,
      isMarkCourseCompleteSuccess,
      isMoveToInProgressCourseSuccess,
    } = this.props;

    if (isLoading) {
      return <LoadingSpinner screenReaderText="loading course enrollments" />;
    }
    if (error) {
      return this.renderError();
    }

    return (
      <>
        {isMarkCourseCompleteSuccess && this.renderMarkCourseCompleteSuccessAlert()}
        {isMoveToInProgressCourseSuccess && this.renderMoveToInProgressCourseSuccessAlert()}
        {/*
          Only render children if there are no course runs.
          This allows the parent component to customize what
          gets displayed if the user does not have any course runs.
        */}
        {!this.hasCourseRuns() && children}
        <CourseSection
          title="My courses in progress"
          component={InProgressCourseCard}
          courseRuns={courseRuns.in_progress}
        />
        <CourseSection
          title="Upcoming courses"
          component={UpcomingCourseCard}
          courseRuns={courseRuns.upcoming}
        />
        <CourseSection
          title="Completed courses"
          subtitle={SAVED_FOR_LATER_COURSES_SECTION_SUBTITLE}
          component={CompletedCourseCard}
          courseRuns={courseRuns.completed}
        />
        <CourseSection
          title="Courses saved for later"
          subtitle={SAVED_FOR_LATER_COURSES_SECTION_SUBTITLE}
          component={SavedForLaterCourseCard}
          courseRuns={courseRuns.savedForLater}
        />
      </>
    );
  }
}

CourseEnrollments.contextType = AppContext;

const mapStateToProps = state => ({
  courseRuns: selectors.getCourseRunsByStatus(state),
  isLoading: selectors.getIsLoading(state),
  error: selectors.getError(state),
  isMarkCourseCompleteSuccess: selectors.getIsMarkCourseCompleteSuccess(state),
  isMoveToInProgressCourseSuccess: selectors.getIsMoveToInProgressCourseSuccess(state),
});

const mapDispatchToProps = dispatch => ({
  fetchCourseEnrollments: (options) => {
    dispatch(actions.fetchCourseEnrollments(options));
  },
  clearCourseEnrollments: () => {
    dispatch(actions.clearCourseEnrollments());
  },
  modifyIsMarkCourseCompleteSuccess: (options) => {
    dispatch(actions.updateIsMarkCourseCompleteSuccess(options));
  },
  modifyIsMoveToInProgressCourseSuccess: (options) => {
    dispatch(actions.updateIsMoveToInProgressCourseSuccess(options));
  },
});

CourseEnrollments.propTypes = {
  fetchCourseEnrollments: PropTypes.func.isRequired,
  clearCourseEnrollments: PropTypes.func.isRequired,
  courseRuns: PropTypes.shape({
    in_progress: PropTypes.array.isRequired,
    upcoming: PropTypes.array.isRequired,
    completed: PropTypes.array.isRequired,
    savedForLater: PropTypes.array.isRequired,
  }).isRequired,
  isLoading: PropTypes.bool.isRequired,
  isMarkCourseCompleteSuccess: PropTypes.bool.isRequired,
  modifyIsMarkCourseCompleteSuccess: PropTypes.func.isRequired,
  isMoveToInProgressCourseSuccess: PropTypes.bool.isRequired,
  modifyIsMoveToInProgressCourseSuccess: PropTypes.func.isRequired,
  error: PropTypes.instanceOf(Error),
  children: PropTypes.oneOfType([
    PropTypes.arrayOf(PropTypes.node),
    PropTypes.node,
  ]),
};

CourseEnrollments.defaultProps = {
  error: null,
  children: null,
};

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(CourseEnrollments);
