import React, { useState } from 'react';
import { Container } from '@openedx/paragon';
import PathwayBreadcrumbs from './breadcrumb/PathwayBreadcrumbs';
import { IntakePage } from './intake';
import CareerSelectionContainer from './CareerSelectionContainer';
import PathwayCoursesContainer from './PathwayCoursesContainer';
import { View, VIEWS } from './constants';

const LearnerPathwaysTab = () => {
  const [view, setView] = useState<View>(VIEWS.ONBOARDING);
  return (
    <div data-testid="learner-pathways-tab-scaffold">
      <PathwayBreadcrumbs view={view} onNavigate={(v: View) => setView(v)} />
      <Container size="md" fluid className="mt-4.5">
        {view === VIEWS.ONBOARDING
          && (
            <IntakePage
              onSubmit={() => setView(VIEWS.PROFILE)}
            />
          )}
        {view === VIEWS.PROFILE
          && (
            <CareerSelectionContainer
              onBack={() => setView(VIEWS.ONBOARDING)}
              onNext={() => setView(VIEWS.PATHWAY)}
            />
          )}
        {view === VIEWS.PATHWAY
          && (
            <PathwayCoursesContainer
              onBackToOnboarding={() => setView(VIEWS.ONBOARDING)}
              onBackToProfile={() => setView(VIEWS.PROFILE)}
            />
          )}
      </Container>
    </div>
  );
};

export default LearnerPathwaysTab;
