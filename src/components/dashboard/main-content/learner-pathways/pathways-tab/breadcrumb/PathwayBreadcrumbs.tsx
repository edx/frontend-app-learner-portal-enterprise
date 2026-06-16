import React from 'react';
import { Breadcrumb } from '@openedx/paragon';
import { useIntl } from '@edx/frontend-platform/i18n';
import { Link } from 'react-router-dom';
import messages from './messages';
import { View } from '../constants';

type BreadcrumbMessageKey = 'onboardingQuiz' | 'profile' | 'pathway';

interface BreadcrumbStep {
  label: BreadcrumbMessageKey;
  view: View;
}

interface Props {
  view: View;
  onNavigate: (view: View) => void;
}

const breadcrumbSteps: BreadcrumbStep[] = [
  { label: 'onboardingQuiz', view: 'onboarding' },
  { label: 'profile', view: 'profile' },
  { label: 'pathway', view: 'pathway' },
];

const getActiveStepIndex = (view: View) => (
  breadcrumbSteps.findIndex((step) => step.view === view)
);

const PathwayBreadcrumbs = ({ view, onNavigate }: Props) => {
  const intl = useIntl();
  const activeStepIndex = getActiveStepIndex(view);

  const links = activeStepIndex > 0
    ? breadcrumbSteps
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
    ? intl.formatMessage(messages[breadcrumbSteps[activeStepIndex].label])
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
