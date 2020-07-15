import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';

import { getAuthenticatedUser } from '@edx/frontend-platform/auth';

import BaseCourseCard from './BaseCourseCard';
import ContinueLearningButton from './ContinueLearningButton';

import {
  updateCourseRunStatus,
  updateIsMoveToInProgressCourseSuccess,
} from '../data/actions';
import { isCourseEnded } from '../../../../../utils/common';
import CertificateImg from './images/edx-verified-mini-cert.png';

const CompletedCourseCard = (props) => {
  const user = getAuthenticatedUser();
  const { username } = user;
  const {
    title,
    linkToCourse,
    courseRunId,
    courseRunStatus,
    endDate,
  } = props;

  const renderButtons = () => {
    if (isCourseEnded(endDate) || courseRunStatus === 'completed') { return null; }
    return (
      <ContinueLearningButton
        linkToCourse={linkToCourse}
        title={title}
        courseRunId={courseRunId}
      />
    );
  };

  const renderCertificateInfo = () => (
    props.linkToCertificate ? (
      <div className="d-flex mb-3">
        <div className="mr-3">
          <img src={CertificateImg} alt="verified certificate preview" />
        </div>
        <div className="d-flex align-items-center">
          <p className="lead mb-0 font-weight-normal">
            View your certificate on{' '}
            <a
              className="text-underline"
              href={`${process.env.LMS_BASE_URL}/u/${username}`}
            >
              your profile →
            </a>
          </p>
        </div>
      </div>
    ) : (
      <p className="lead mb-3 font-weight-normal">
        To earn a certificate,{' '}
        <a className="text-underline" href={props.linkToCourse}>
          retake this course →
        </a>
      </p>
    )
  );

  return (
    <BaseCourseCard
      buttons={renderButtons()}
      type="completed"
      hasViewCertificateLink={false}
      {...props}
    >
      {renderCertificateInfo()}
    </BaseCourseCard>
  );
};

CompletedCourseCard.propTypes = {
  linkToCourse: PropTypes.string.isRequired,
  courseRunId: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  linkToCertificate: PropTypes.string,
  savedForLater: PropTypes.bool.isRequired,
  courseRunStatus: PropTypes.string.isRequired,
  modifyCourseRunStatus: PropTypes.func.isRequired,
  modifyIsMoveToInProgressCourseStatus: PropTypes.func.isRequired,
  endDate: PropTypes.string,
};

CompletedCourseCard.defaultProps = {
  linkToCertificate: null,
  endDate: null,
};

const mapDispatchToProps = dispatch => ({
  modifyCourseRunStatus: (options) => {
    // TODO remove this override of status once api is fixed or we find a better way to categorize the cards
    // right now categorization is by status only, but it gets confusing if saved_for_later is false and
    // status=complete for example
    dispatch(updateCourseRunStatus({ ...options, status: 'in_progress' }));
  },
  modifyIsMoveToInProgressCourseStatus: (options) => {
    dispatch(updateIsMoveToInProgressCourseSuccess(options));
  },
});

export default connect(null, mapDispatchToProps)(CompletedCourseCard);
