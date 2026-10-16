import { useCallback, useMemo, useRef } from 'react';
import { sendEnterpriseTrackEvent } from '@2uinc/frontend-enterprise-utils';

import { useEnterpriseCustomer } from '../../../../../app/data';
import { PATHWAYS_EVENTS } from '../../../../../../eventTracking';
import {
  usePathwaysSection,
  usePathwaysLearnerProfile,
  usePathwaysCareerMatches,
  usePathwaysSelectedCareerId,
  usePathwaysSelectedSkills,
  usePathwaysCourses,
  usePathwayGenerationMode,
  useSelectedCareerMatch,
} from '../state';
import type { PathwaysSection } from '../state';

const PATHWAYS_SCHEMA_VERSION = 1;

export type PathwaysJourneyStage =
  | 'not_started'
  | 'intake_in_progress'
  | 'profile_generated'
  | 'career_selected'
  | 'pathway_generated';

export type NavigationSource = 'initial_render' | 'breadcrumb' | 'action_bar' | 'workflow_completion' | 'hydration';

/**
 * Analytics-only proxy for journey progress, deliberately distinct from the store's own
 * `PathwaysExperienceStatus` (which needs enrollment `progress` not available at most
 * event call sites) — different name, different values, so the two are never confused.
 */
const deriveJourneyStage = ({
  hasIntakeStarted,
  hasLearnerProfile,
  hasSelectedCareer,
  hasPathway,
}: {
  hasIntakeStarted: boolean;
  hasLearnerProfile: boolean;
  hasSelectedCareer: boolean;
  hasPathway: boolean;
}): PathwaysJourneyStage => {
  if (hasPathway) {
    return 'pathway_generated';
  }
  if (hasSelectedCareer) {
    return 'career_selected';
  }
  if (hasLearnerProfile) {
    return 'profile_generated';
  }
  if (hasIntakeStarted) {
    return 'intake_in_progress';
  }
  return 'not_started';
};

/**
 * Single coordinator for every Learner Pathways Segment event. Every component that needs
 * to fire a Pathways event calls this hook instead of `sendEnterpriseTrackEvent` +
 * `useEnterpriseCustomer` directly, so common context (journey stage, selected career,
 * schema version, etc.) is computed once and merged consistently rather than each call
 * site re-deriving it and risking drift.
 */
export const usePathwaysAnalytics = () => {
  const { data: enterpriseCustomer } = useEnterpriseCustomer();
  const pathwayStep = usePathwaysSection();
  const learnerProfile = usePathwaysLearnerProfile();
  const careerMatches = usePathwaysCareerMatches();
  const selectedCareerId = usePathwaysSelectedCareerId();
  const selectedSkills = usePathwaysSelectedSkills();
  const selectedCareerMatch = useSelectedCareerMatch();
  const pathwayCourses = usePathwaysCourses();
  const pathwayGenerationMode = usePathwayGenerationMode();

  const commonContext = useMemo(() => {
    const hasLearnerProfile = learnerProfile !== null;
    const hasCareerMatches = careerMatches.length > 0;
    const hasSelectedCareer = selectedCareerId !== null;
    const hasSelectedSkills = Boolean(selectedSkills?.length);
    const hasPathway = pathwayCourses.length > 0;

    return {
      pathwayStep,
      pathwayMode: pathwayGenerationMode,
      pathwaysSchemaVersion: PATHWAYS_SCHEMA_VERSION,
      pathwaysJourneyStage: deriveJourneyStage({
        hasIntakeStarted: pathwayStep !== 'onboarding' || hasLearnerProfile,
        hasLearnerProfile,
        hasSelectedCareer,
        hasPathway,
      }),
      hasLearnerProfile,
      hasCareerMatches,
      hasSelectedCareer,
      hasSelectedSkills,
      hasPathway,
      selectedCareerId: selectedCareerMatch?.id ?? null,
      selectedCareerName: selectedCareerMatch?.title ?? null,
      selectedSkillCount: selectedSkills?.length ?? null,
      pathwayCourseCount: pathwayCourses.length,
    };
  }, [
    pathwayStep, learnerProfile, careerMatches, selectedCareerId, selectedSkills,
    selectedCareerMatch, pathwayCourses, pathwayGenerationMode,
  ]);

  const emit = useCallback((eventName: string, properties: Record<string, unknown>) => {
    if (!enterpriseCustomer?.uuid) {
      return;
    }
    sendEnterpriseTrackEvent(enterpriseCustomer.uuid, eventName, { ...commonContext, ...properties });
  }, [enterpriseCustomer?.uuid, commonContext]);

  // Section transitions all funnel through named callbacks in LearnerPathwaysTab.tsx;
  // each sets this ref immediately before calling setSection(...), so trackStepViewed can
  // attribute the transition to its actual trigger without a redundant separate event.
  const lastNavigationSourceRef = useRef<NavigationSource>('initial_render');
  const setNavigationSource = useCallback((source: NavigationSource) => {
    lastNavigationSourceRef.current = source;
  }, []);

  // Dedup guard mirrors useDashboardTabs.jsx's page-visit pattern: only fire once per
  // distinct section, never on unrelated rerenders.
  const lastTrackedStepRef = useRef<PathwaysSection | null>(null);
  const isFirstStepEventRef = useRef(true);
  const trackStepViewed = useCallback(() => {
    if (lastTrackedStepRef.current === pathwayStep) {
      return;
    }
    const isResumedSession = isFirstStepEventRef.current && pathwayStep !== 'onboarding';
    isFirstStepEventRef.current = false;
    lastTrackedStepRef.current = pathwayStep;
    const navigationSource = lastNavigationSourceRef.current;
    emit(PATHWAYS_EVENTS.STEP_VIEWED, { navigationSource, isResumedSession });
  }, [emit, pathwayStep]);

  const trackIntakeSubmitted = useCallback((properties: Record<string, unknown>) => (
    emit(PATHWAYS_EVENTS.INTAKE_SUBMITTED, properties)
  ), [emit]);

  const trackIntakeValidationFailed = useCallback((properties: Record<string, unknown>) => (
    emit(PATHWAYS_EVENTS.INTAKE_VALIDATION_FAILED, properties)
  ), [emit]);

  const trackProfileGenerationCompleted = useCallback((properties: Record<string, unknown>) => (
    emit(PATHWAYS_EVENTS.PROFILE_GENERATION_COMPLETED, properties)
  ), [emit]);

  const trackCareerSelected = useCallback((properties: Record<string, unknown>) => (
    emit(PATHWAYS_EVENTS.CAREER_SELECTED, properties)
  ), [emit]);

  const trackSkillUpdated = useCallback((properties: Record<string, unknown>) => (
    emit(PATHWAYS_EVENTS.SKILL_UPDATED, properties)
  ), [emit]);

  const trackBuildRequested = useCallback((properties: Record<string, unknown>) => (
    emit(PATHWAYS_EVENTS.BUILD_REQUESTED, properties)
  ), [emit]);

  const trackBuildCompleted = useCallback((properties: Record<string, unknown>) => (
    emit(PATHWAYS_EVENTS.BUILD_COMPLETED, properties)
  ), [emit]);

  const trackCourseClicked = useCallback((properties: Record<string, unknown>) => (
    emit(PATHWAYS_EVENTS.COURSE_CLICKED, properties)
  ), [emit]);

  const trackQuizRetaken = useCallback((properties: Record<string, unknown>) => (
    emit(PATHWAYS_EVENTS.QUIZ_RETAKEN, properties)
  ), [emit]);

  const trackFeedbackLinkClicked = useCallback((properties: Record<string, unknown>) => (
    emit(PATHWAYS_EVENTS.FEEDBACK_LINK_CLICKED, properties)
  ), [emit]);

  const trackControlInteracted = useCallback((properties: Record<string, unknown>) => (
    emit(PATHWAYS_EVENTS.CONTROL_INTERACTED, properties)
  ), [emit]);

  return {
    setNavigationSource,
    trackStepViewed,
    trackIntakeSubmitted,
    trackIntakeValidationFailed,
    trackProfileGenerationCompleted,
    trackCareerSelected,
    trackSkillUpdated,
    trackBuildRequested,
    trackBuildCompleted,
    trackCourseClicked,
    trackQuizRetaken,
    trackFeedbackLinkClicked,
    trackControlInteracted,
  };
};
