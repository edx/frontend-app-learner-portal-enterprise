import React from 'react';
import { Breadcrumb } from '@openedx/paragon';
import { useIntl } from '@edx/frontend-platform/i18n';

import messages from './messages';
import { View } from '../constants';

type BreadcrumbMessageKey = 'onboardingQuiz' | 'profile' | 'pathway';

interface ParagonLink {
  label: BreadcrumbMessageKey;
  to?: string;
  onClick?: () => void;
}
interface Props {
  view: View;
  onNavigate: (v: View) => void;
}

function buildBreadcrumbConfig(
  view: View,
  onNavigate: (v: View) => void,
): { links: ParagonLink[]; activeLabel: BreadcrumbMessageKey | '' } {
  switch (view) {
    case 'onboarding':
      return { links: [], activeLabel: 'onboardingQuiz' };

    case 'profile':
      return {
        links: [{ label: 'onboardingQuiz', onClick: () => onNavigate('onboarding') }],
        activeLabel: 'profile',
      };

    case 'pathway':
      return {
        links: [
          { label: 'onboardingQuiz', onClick: () => onNavigate('onboarding') },
          { label: 'profile', onClick: () => onNavigate('profile') },
        ],
        activeLabel: 'pathway',
      };

    default:
      return { links: [], activeLabel: '' };
  }
}

const PathwayBreadcrumbs: React.FC<Props> = ({ view, onNavigate }) => {
  const intl = useIntl();
  const { links, activeLabel } = buildBreadcrumbConfig(view, onNavigate);

  const pathwayLinks = links.map((link) => ({
    label: intl.formatMessage(messages[link.label]),
    href: `#learner-pathways-${link.label}`,
    onClick: (e: React.MouseEvent<HTMLAnchorElement>) => {
      e.preventDefault();
      link.onClick?.();
    },
  }));

  return (
    <div data-testid="pathway-breadcrumbs" className="header-breadcrumbs my-2">
      <Breadcrumb
        ariaLabel={intl.formatMessage(messages.breadcrumbAriaLabel)}
        links={pathwayLinks}
        activeLabel={activeLabel ? intl.formatMessage(messages[activeLabel]) : ''}
      />
    </div>
  );
};

export default PathwayBreadcrumbs;
