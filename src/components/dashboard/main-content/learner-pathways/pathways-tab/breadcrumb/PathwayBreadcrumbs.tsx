import React from 'react';
import { Breadcrumb } from '@openedx/paragon';
import { useIntl } from '@edx/frontend-platform/i18n';
import { View } from '../LearnerPathwaysTab';
import messages from './messages';

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

const LinkAs: React.FC<any> = ({ children, onClick, to, ...rest }) => {
  const label = typeof children === 'string' ? children : '';
  const testId = `breadcrumb-link-${label.replace(/\s+/g, '-').toLowerCase()}`;

  return (
    <a
      href={typeof to === 'string' ? to : '#'}
      data-testid={testId}
      onClick={(e) => {
        e.preventDefault();
        if (typeof onClick === 'function') onClick();
      }}
      {...rest}
    >
      {children}
    </a>
  );
};

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

  if (view === 'initial') {
    return null;
  }

  const { links, activeLabel } = buildBreadcrumbConfig(view, onNavigate);

  const pathwayLinks = links.map((link) => ({
    label: intl.formatMessage(messages[link.label]),
    to: '#',
    onClick: link.onClick,
  }));

  return (
    <div data-testid="pathway-breadcrumbs" className="mb-3">
      <Breadcrumb
        links={pathwayLinks}
        linkAs={LinkAs as any}
        activeLabel={activeLabel ? intl.formatMessage(messages[activeLabel]) : ''}
      />
    </div>
  );
};

export default PathwayBreadcrumbs;
