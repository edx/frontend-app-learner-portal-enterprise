import React, { useState } from 'react';
import { Container } from '@openedx/paragon';
import PathwayBreadcrumbs from './breadcrumb/PathwayBreadcrumbs';
import IntakeQuestionsContainer from './IntakeQuestionsContainer';
import CareerSelectionContainer from './CareerSelectionContainer';
import PathwayCoursesContainer from './PathwayCoursesContainer';
import { View, VIEWS } from './constants';

const LearnerPathwaysTab: React.FC = () => {
  const [view, setView] = useState<View>(VIEWS.ONBOARDING);
  return (
    <div data-testid="learner-pathways-tab-scaffold">
      <PathwayBreadcrumbs view={view} onNavigate={(v: View) => setView(v)} />
      <Container size="md" fluid="md" className="mt-4.5">
        {view === VIEWS.ONBOARDING
          && (
            <IntakeQuestionsContainer
              onNext={() => setView(VIEWS.PROFILE)}
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
