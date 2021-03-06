import React, { useState } from 'react';
import thunk from 'redux-thunk';
import configureMockStore from 'redux-mock-store';
import '@testing-library/jest-dom/extend-expect';
import { screen } from '@testing-library/react';
import { AppContext } from '@edx/frontend-platform/react';
import { Provider as ReduxProvider } from 'react-redux';
import { UserSubsidyContext } from '../../enterprise-user-subsidy';

import {
  renderWithRouter, fakeReduxStore,
} from '../../../utils/tests';
import GoalDropdown from '../GoalDropdown';

const mockStore = configureMockStore([thunk]);

/* eslint-disable react/prop-types */
const GoalDropdownWithContext = ({
  initialAppState = {},
  initialUserSubsidyState = {},
  initialReduxStore = fakeReduxStore,
}) => {
  const [currentGoal, setCurrentGoal] = useState('Goal');
  return (
    <AppContext.Provider value={initialAppState}>
      <UserSubsidyContext.Provider value={initialUserSubsidyState}>
        <ReduxProvider store={mockStore(initialReduxStore)}>
          <GoalDropdown currentGoal={currentGoal} setCurrentGoal={setCurrentGoal} />
        </ReduxProvider>
      </UserSubsidyContext.Provider>
    </AppContext.Provider>
  );
};
/* eslint-enable react/prop-types */

const mockLocation = {
  pathname: '/welcome',
  hash: '',
  search: '',
  state: { activationSuccess: true },
};

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useLocation: () => (mockLocation),
}));

jest.mock('@edx/frontend-platform/auth', () => ({
  ...jest.requireActual('@edx/frontend-platform/auth'),
  getAuthenticatedUser: () => ({ username: 'myspace-tom' }),
}));

describe('<GoalDropdown />', () => {
  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('renders goal dropdown successfully.', () => {
    renderWithRouter(
      <GoalDropdownWithContext />,
      { route: '/test/skills-quiz/' },
    );
    expect(screen.getByText('Goal')).toBeTruthy();
  });
});
