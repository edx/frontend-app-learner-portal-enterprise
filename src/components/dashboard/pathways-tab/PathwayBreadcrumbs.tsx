import React from 'react';
import { Breadcrumb } from '@openedx/paragon';
import { View } from './LearnerPathwaysTab';

interface ParagonLink {
  label: string;
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

function buildBreadcrumbConfig(view: View, onNavigate: (v: View) => void): { links: ParagonLink[]; activeLabel: string } {
  switch (view) {
    case 'onboarding':
      return { links: [], activeLabel: 'Onboarding Quiz' };
    case 'profile':
      return { links: [{ label: 'Onboarding Quiz', onClick: () => onNavigate('onboarding') }], activeLabel: 'Profile' };
    case 'pathway':
      return {
        links: [
          { label: 'Onboarding Quiz', onClick: () => onNavigate('onboarding') },
          { label: 'Profile', onClick: () => onNavigate('profile') },
        ],
        activeLabel: 'Your Pathway',
      };
    default:
      return { links: [], activeLabel: '' };
  }
}

const PathwayBreadcrumbs: React.FC<Props> = ({ view, onNavigate }) => {
  if (view === 'initial') return null;
  const { links, activeLabel } = buildBreadcrumbConfig(view, onNavigate);
  const paragonLinks = links.map((l) => ({ label: l.label, to: '#', onClick: l.onClick }));

  return (
    <div data-testid="pathway-breadcrumbs" className="mb-3">
      <Breadcrumb links={paragonLinks} linkAs={LinkAs as any} activeLabel={activeLabel} />
    </div>
  );
};

export default PathwayBreadcrumbs;
