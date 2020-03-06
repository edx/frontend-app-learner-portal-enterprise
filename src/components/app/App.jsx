import React from 'react';
import { Switch } from 'react-router-dom';
import { AppProvider, PageRoute } from '@edx/frontend-platform/react';

import { DashboardPage } from '../dashboard';
import NotFoundPage from '../NotFoundPage';

import store from '../../store';

import '../../assets/favicon.ico';

export default function App() {
  return (
    <AppProvider store={store}>
      <Switch>
        <PageRoute path="/:enterpriseSlug" component={DashboardPage} />
        <PageRoute path="*" component={NotFoundPage} />
      </Switch>
    </AppProvider>
  );
}
