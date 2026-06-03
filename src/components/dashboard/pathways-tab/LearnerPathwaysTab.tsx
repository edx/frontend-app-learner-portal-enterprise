import React, { useState } from 'react';
import { LearnerPathwaysTabInitialState } from './initial-state';
import PathwayBreadcrumbs from './PathwayBreadcrumbs';
import IntakeQuestionsContainer from './IntakeQuestionsContainer';
import CareerSelectionContainer from './CareerSelectionContainer';
import PathwayCoursesContainer from './PathwayCoursesContainer';

export const VIEWS = {
  INITIAL: 'initial',
  ONBOARDING: 'onboarding',
  PROFILE: 'profile',
  PATHWAY: 'pathway',
} as const;

export type View = typeof VIEWS[keyof typeof VIEWS];

const LearnerPathwaysTab: React.FC = () => {
  const [view, setView] = useState<View>(VIEWS.INITIAL);
  return (
    <div data-testid="learner-pathways-tab-scaffold">
      <PathwayBreadcrumbs view={view} onNavigate={(v: View) => setView(v)} />
      {view === VIEWS.INITIAL && <LearnerPathwaysTabInitialState onStart={() => setView(VIEWS.ONBOARDING)} />}
      {view === VIEWS.ONBOARDING && <IntakeQuestionsContainer onNext={() => setView(VIEWS.PROFILE)} onBack={() => setView(VIEWS.INITIAL)} />}
      {view === VIEWS.PROFILE && <CareerSelectionContainer onBack={() => setView(VIEWS.ONBOARDING)} onNext={() => setView(VIEWS.PATHWAY)} />}
      {view === VIEWS.PATHWAY && <PathwayCoursesContainer onBackToOnboarding={() => setView(VIEWS.ONBOARDING)} onBackToProfile={() => setView(VIEWS.PROFILE)} />}
    </div>
  );
};

export default LearnerPathwaysTab;
