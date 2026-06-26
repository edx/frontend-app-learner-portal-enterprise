import React from 'react';
import { Container } from '@openedx/paragon';
import PathwayBreadcrumbs from './breadcrumb/PathwayBreadcrumbs';
import { IntakePage } from './intake';
import CareerSelectionContainer from './CareerSelectionContainer';
import PathwayCoursesContainer from './PathwayCoursesContainer';
import { VIEWS } from './constants';
import { usePathwaysStore, selectors } from './state';
import type { PathwaysSection } from './state';

const LearnerPathwaysTab = () => {
  const section = usePathwaysStore(selectors.section);
  const setSection = usePathwaysStore((state) => state.setSection);

  return (
    <div data-testid="learner-pathways-tab-scaffold">
      <PathwayBreadcrumbs
        view={section}
        onNavigate={(v: PathwaysSection) => setSection(v)}
      />
      <Container size="md" fluid className="mt-4.5">
        {section === VIEWS.ONBOARDING && (
          <IntakePage onSubmit={() => setSection('profile')} />
        )}
        {section === VIEWS.PROFILE && (
          <CareerSelectionContainer onNext={() => setSection('pathway')} />
        )}
        {section === VIEWS.PATHWAY && (
          <PathwayCoursesContainer
            onBackToOnboarding={() => setSection('onboarding')}
            onBackToProfile={() => setSection('profile')}
          />
        )}
      </Container>
    </div>
  );
};

export default LearnerPathwaysTab;
