import React from 'react';
import { Breadcrumb } from '@openedx/paragon';
import { useIntl } from '@edx/frontend-platform/i18n';
import { Link } from 'react-router-dom';
import messages from './messages';
import { View } from '../constants';
import type { PathwaysFlowVariant } from '../flowVariant';

type BreadcrumbMessageKey = 'onboardingQuiz' | 'profile' | 'pathway';

interface BreadcrumbStep {
  label: BreadcrumbMessageKey;
  view: View;
}

interface Props {
  view: View;
  onNavigate: (view: View) => void;
  /**
   * Which flow's step list to render. The skills flow is two steps — it has no Career
   * Profile page — so its trail must not offer a link to a page it never visits.
   * Defaults to the three-step career trail.
   */
  flowVariant?: PathwaysFlowVariant;
}

const careerBreadcrumbSteps: BreadcrumbStep[] = [
  { label: 'onboardingQuiz', view: 'onboarding' },
  { label: 'profile', view: 'profile' },
  { label: 'pathway', view: 'pathway' },
];

const skillsBreadcrumbSteps: BreadcrumbStep[] = [
  { label: 'onboardingQuiz', view: 'onboarding' },
  { label: 'pathway', view: 'pathway' },
];

const getBreadcrumbSteps = (flowVariant: PathwaysFlowVariant): BreadcrumbStep[] => (
  flowVariant === 'skills' ? skillsBreadcrumbSteps : careerBreadcrumbSteps
);

const PathwayBreadcrumbs = ({ view, onNavigate, flowVariant = 'career' }: Props) => {
  const intl = useIntl();
  const steps = getBreadcrumbSteps(flowVariant);
  const activeStepIndex = steps.findIndex((step) => step.view === view);

  const links = activeStepIndex > 0
    ? steps
      .slice(0, activeStepIndex)
      .map((step) => ({
        label: intl.formatMessage(messages[step.label]),
        to: `#learner-pathways-${step.view}`,
        onClick: (event: React.MouseEvent<HTMLAnchorElement>) => {
          event.preventDefault();
          onNavigate(step.view);
        },
      }))
    : [];

  const activeLabel = activeStepIndex >= 0
    ? intl.formatMessage(messages[steps[activeStepIndex].label])
    : '';

  return (
    <div data-testid="pathway-breadcrumbs" className="small mt-3 mx-3">
      <Breadcrumb
        ariaLabel={intl.formatMessage(messages.breadcrumbAriaLabel)}
        links={links}
        linkAs={Link}
        activeLabel={activeLabel}
      />
    </div>
  );
};

export default PathwayBreadcrumbs;
