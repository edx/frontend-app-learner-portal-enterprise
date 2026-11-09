import { useState } from 'react';
import PropTypes from 'prop-types';
import { Form, StatefulButton, Alert } from '@openedx/paragon';
import { CheckCircle } from '@openedx/paragon/icons';
import { FormattedMessage, defineMessages, useIntl } from '@edx/frontend-platform/i18n';
import { useMutation } from '@tanstack/react-query';
import { sendEnterpriseTrackEvent } from '@2uinc/frontend-enterprise-utils';

import { useEnterpriseCustomer } from '../../app/data';
import { saveWeeklyLearningGoal } from './data/learningGoalService';

const messages = defineMessages({
  label: {
    id: 'learner.portal.dashboard.learning.goal.label',
    defaultMessage: 'Weekly learning goal (hours)',
    description: 'Label for the weekly learning goal input on the learner dashboard',
  },
  saveButtonDefault: {
    id: 'learner.portal.dashboard.learning.goal.save.button.default',
    defaultMessage: 'Save',
    description: 'Default text for the learning goal save button',
  },
  saveButtonPending: {
    id: 'learner.portal.dashboard.learning.goal.save.button.pending',
    defaultMessage: 'Saving',
    description: 'Text for the learning goal save button while saving',
  },
  saveButtonComplete: {
    id: 'learner.portal.dashboard.learning.goal.save.button.complete',
    defaultMessage: 'Saved',
    description: 'Text for the learning goal save button after a successful save',
  },
  saveButtonError: {
    id: 'learner.portal.dashboard.learning.goal.save.button.error',
    defaultMessage: 'Try again',
    description: 'Text for the learning goal save button after a failed save',
  },
  savedConfirmation: {
    id: 'learner.portal.dashboard.learning.goal.saved.confirmation',
    defaultMessage: 'Your weekly learning goal has been saved.',
    description: 'Confirmation message shown after the weekly learning goal is saved',
  },
});

const LearningGoalForm = ({ className }) => {
  const intl = useIntl();
  const { data: enterpriseCustomer } = useEnterpriseCustomer();
  const [goalHours, setGoalHours] = useState('');

  const {
    mutate: submitGoalHours,
    isPending,
    isSuccess,
    isError,
  } = useMutation({
    mutationFn: saveWeeklyLearningGoal,
    onSuccess: () => {
      sendEnterpriseTrackEvent(
        enterpriseCustomer.uuid,
        'edx.ui.enterprise.learner_portal.dashboard.learning_goal.saved',
        { goal_hours: goalHours },
      );
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    submitGoalHours(goalHours);
  };

  const getButtonState = () => {
    if (isPending) {
      return 'pending';
    }
    if (isError) {
      return 'error';
    }
    if (isSuccess) {
      return 'complete';
    }
    return 'default';
  };

  return (
    <Form className={className} onSubmit={handleSubmit}>
      <Form.Group controlId="weekly-learning-goal-input">
        <Form.Label>
          <FormattedMessage {...messages.label} />
        </Form.Label>
        <Form.Control
          type="number"
          min="0"
          value={goalHours}
          onChange={(e) => setGoalHours(e.target.value)}
        />
      </Form.Group>
      <StatefulButton
        type="submit"
        state={getButtonState()}
        disabledStates={['pending']}
        labels={{
          default: intl.formatMessage(messages.saveButtonDefault),
          pending: intl.formatMessage(messages.saveButtonPending),
          complete: intl.formatMessage(messages.saveButtonComplete),
          error: intl.formatMessage(messages.saveButtonError),
        }}
      />
      <div aria-live="polite">
        {isSuccess && (
          <Alert variant="success" icon={CheckCircle} className="mt-2">
            <FormattedMessage {...messages.savedConfirmation} />
          </Alert>
        )}
      </div>
    </Form>
  );
};

LearningGoalForm.propTypes = {
  className: PropTypes.string,
};

LearningGoalForm.defaultProps = {
  className: '',
};

export default LearningGoalForm;
