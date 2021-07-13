import React from 'react';
import { Form, Icon, FavoriteBorder } from '@edx/paragon';
import PropTypes from 'prop-types';
import {
  DROPDOWN_OPTION_CHANGE_CAREERS, DROPDOWN_OPTION_CHANGE_RULE, DROPDOWN_OPTION_GET_PROMOTED, DROPDOWN_OPTION_OTHER,
} from './constants';

const GoalDropdown = ({ currentGoal, setCurrentGoal }) => {
  const handleDropdownChange = e => {
    setCurrentGoal(e.target.value);
  };
  return (
    <Form.Control
      as="select"
      value={currentGoal}
      onChange={handleDropdownChange}
      floatingLabel="Goal"
    >
      <option value="">Select a goal</option>
      <option>{DROPDOWN_OPTION_CHANGE_CAREERS}</option>
      <option>{DROPDOWN_OPTION_GET_PROMOTED}</option>
      <option>{DROPDOWN_OPTION_CHANGE_RULE}</option>
      <option>{DROPDOWN_OPTION_OTHER}</option>
    </Form.Control>
  );
};

GoalDropdown.propTypes = {
  currentGoal: PropTypes.string.isRequired,
  setCurrentGoal: PropTypes.func.isRequired,
};

export default GoalDropdown;
