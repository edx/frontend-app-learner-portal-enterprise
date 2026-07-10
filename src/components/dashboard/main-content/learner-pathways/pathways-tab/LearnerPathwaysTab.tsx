import React, { useCallback } from 'react';
import { Container } from '@openedx/paragon';
import { getConfig } from '@edx/frontend-platform/config';

import useAlgoliaSearch from '../../../../app/data/hooks/useAlgoliaSearch';
import PathwayBreadcrumbs from './breadcrumb/PathwayBreadcrumbs';
import { IntakePage } from './intake';
import CareerSelectionContainer from './CareerSelectionContainer';
import PathwayCoursesContainer from './PathwayCoursesContainer';
import { VIEWS } from './constants';
import { usePathwaysStore, selectors } from './state';
import type { OnboardingAnswers, PathwaysSection } from './state';
import { PathwaysActionBarProvider } from './action-bar';
import { usePathwaysController } from './hooks';

const LearnerPathwaysTab = () => {
  const section = usePathwaysStore(selectors.section);
  const setSection = usePathwaysStore((state) => state.setSection);

  // Single top-level owner of both Algolia indexes — passed down as explicit
  // props/hook-args rather than obtained separately by every controller
  // consumer, to avoid redundant Algolia-hook mounts (see usePathwaysController).
  const { searchIndex: jobIndex } = useAlgoliaSearch(getConfig().ALGOLIA_INDEX_NAME_JOBS);
  const { searchIndex: catalogIndex } = useAlgoliaSearch(
    getConfig().ALGOLIA_INDEX_NAME_V2 || getConfig().ALGOLIA_INDEX_NAME,
  );

  const { generateProfile } = usePathwaysController({ jobIndex, catalogIndex });

  const handleBackToProfile = useCallback(() => setSection('profile'), [setSection]);

  // Integration seam: intake submission drives the full intake -> Learning
  // Intent -> taxonomy career search flow through the controller/workflow seam
  // (see usePathwaysController.generateProfile / generateProfileWorkflow). The
  // controller owns state commits and navigation; this handler only needs to
  // swallow a failed attempt so the learner stays on the onboarding section and
  // can retry — the error is already recorded in errors.learnerProfile.
  const handleIntakeSubmit = useCallback(async (values: OnboardingAnswers) => {
    try {
      await generateProfile(values);
    } catch (error) {
      // Error already recorded in errors.learnerProfile by the controller;
      // stay on the onboarding section so the learner can retry.
    }
  }, [generateProfile]);

  return (
    <PathwaysActionBarProvider>
      <div data-testid="learner-pathways-tab-scaffold">
        <PathwayBreadcrumbs
          view={section}
          onNavigate={(v: PathwaysSection) => setSection(v)}
        />
        <Container size="md" fluid className="mt-4.5">
          {section === VIEWS.ONBOARDING && (
            <IntakePage onSubmit={handleIntakeSubmit} />
          )}
          {section === VIEWS.PROFILE && (
            <CareerSelectionContainer jobIndex={jobIndex} catalogIndex={catalogIndex} />
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
