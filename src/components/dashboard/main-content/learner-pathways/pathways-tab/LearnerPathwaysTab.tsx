import React, { useCallback } from 'react';
import { Container } from '@openedx/paragon';
import PathwayBreadcrumbs from './breadcrumb/PathwayBreadcrumbs';
import { IntakePage } from './intake';
import CareerSelectionContainer from './CareerSelectionContainer';
import PathwayCoursesContainer from './PathwayCoursesContainer';
import { VIEWS } from './constants';
import { usePathwaysStore, selectors } from './state';
import type { PathwaysSection } from './state';
import { PathwaysActionBarProvider } from './action-bar';

const LearnerPathwaysTab = () => {
  const section = usePathwaysStore(selectors.section);
  const setSection = usePathwaysStore((state) => state.setSection);

  const handleBackToProfile = useCallback(() => setSection('profile'), [setSection]);
  const handleNext = useCallback(() => setSection('pathway'), [setSection]);
  const handleRetakeQuiz = useCallback(() => setSection('onboarding'), [setSection]);

  return (
    <PathwaysActionBarProvider>
      <div data-testid="learner-pathways-tab-scaffold">
        <PathwayBreadcrumbs
          view={section}
          onNavigate={(v: PathwaysSection) => setSection(v)}
        />
        <Container size="md" fluid className="mt-4.5">
          {section === VIEWS.ONBOARDING && (
            // Integration seam: IntakePage.onSubmit currently only advances the section.
            // Future: normalized IntakeFormValues should flow through
            // controller.generateProfile(explicitValues) -> generateProfileWorkflow
            // -> fetchLearningIntent -> career/taxonomy retrieval -> profile store update,
            // and navigate to the profile section only after that orchestration succeeds.
            <IntakePage onSubmit={() => setSection('profile')} />
          )}
          {section === VIEWS.PROFILE && (
            <CareerSelectionContainer onNext={handleNext} onRetakeQuiz={handleRetakeQuiz} />
          )}
          {section === VIEWS.PATHWAY && (
            <PathwayCoursesContainer onBackToProfile={handleBackToProfile} />
          )}
        </Container>
      </div>
    </PathwaysActionBarProvider>
  );
};

export default LearnerPathwaysTab;
