import '@testing-library/jest-dom/extend-expect';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { IntlProvider } from '@edx/frontend-platform/i18n';

import PathwayCourseActionButton from '../PathwayCourseActionButton';
import type { ResolvedPathwayCourseAction } from '../resolvePathwayCourses';

const COURSE_TITLE = 'Financial Analysis & Evaluation';

const renderComponent = (action: ResolvedPathwayCourseAction) => render(
  <MemoryRouter>
    <IntlProvider locale="en">
      <PathwayCourseActionButton action={action} courseTitle={COURSE_TITLE} />
    </IntlProvider>
  </MemoryRouter>,
);

const viewCourseAction: ResolvedPathwayCourseAction = {
  kind: 'view_course',
  destination: '/test-enterprise/course/financial-analysis-evaluation',
  isExternal: false,
};

const continueAction: ResolvedPathwayCourseAction = {
  kind: 'continue',
  destination: 'https://learning.edx.org/course/course-v1:edX+FA+2024/resume',
  isExternal: false,
};

const viewCertificateAction: ResolvedPathwayCourseAction = {
  kind: 'view_certificate',
  destination: 'https://courses.edx.org/certificates/abc123',
  isExternal: true,
};

describe('PathwayCourseActionButton', () => {
  it('renders View Course as an internal link to the exact enterprise course route', () => {
    renderComponent(viewCourseAction);
    const link = screen.getByRole('link', { name: /View Course/ });
    expect(link).toHaveAttribute('href', viewCourseAction.destination);
  });

  it('renders Continue as a link to the exact normalized linkToCourse', () => {
    renderComponent(continueAction);
    const link = screen.getByRole('link', { name: /Continue/ });
    expect(link).toHaveAttribute('href', continueAction.destination);
  });

  it('renders View Certificate as a link to the exact normalized certificate URL', () => {
    renderComponent(viewCertificateAction);
    const link = screen.getByRole('link', { name: /View Certificate/ });
    expect(link).toHaveAttribute('href', viewCertificateAction.destination);
  });

  it('opens internal actions in the same tab and the external certificate action in a new tab', () => {
    const { unmount: unmountViewCourse } = renderComponent(viewCourseAction);
    expect(screen.getByRole('link', { name: /View Course/ })).not.toHaveAttribute('target');
    unmountViewCourse();

    const { unmount: unmountContinue } = renderComponent(continueAction);
    expect(screen.getByRole('link', { name: /Continue/ })).not.toHaveAttribute('target');
    unmountContinue();

    renderComponent(viewCertificateAction);
    const certificateLink = screen.getByRole('link', { name: /View Certificate/ });
    expect(certificateLink).toHaveAttribute('target', '_blank');
    expect(certificateLink.getAttribute('rel')).toEqual(expect.stringContaining('noopener'));
  });

  it('renders the Figma-aligned Paragon variant for each action kind', () => {
    const { unmount } = renderComponent(viewCourseAction);
    expect(screen.getByRole('link', { name: /View Course/ })).toHaveClass('btn-primary', 'btn-sm');
    unmount();

    renderComponent(continueAction);
    expect(screen.getByRole('link', { name: /Continue/ })).toHaveClass('btn-outline-primary', 'btn-sm');
  });

  it('shows exactly one launch icon for the external certificate action and none for internal actions', () => {
    const { container: internalContainer } = renderComponent(viewCourseAction);
    expect(internalContainer.querySelectorAll('svg')).toHaveLength(0);

    const { container: externalContainer } = renderComponent(viewCertificateAction);
    expect(externalContainer.querySelectorAll('svg')).toHaveLength(1);
  });

  it('keeps the visible label concise', () => {
    const { unmount: unmountViewCourse } = renderComponent(viewCourseAction);
    expect(screen.getByText('View Course')).toBeInTheDocument();
    unmountViewCourse();

    const { unmount: unmountContinue } = renderComponent(continueAction);
    expect(screen.getByText('Continue')).toBeInTheDocument();
    unmountContinue();

    renderComponent(viewCertificateAction);
    expect(screen.getByText('View Certificate')).toBeInTheDocument();
  });

  it('exposes an accessible name that includes the course title for every action kind', () => {
    const titleRegExp = new RegExp(COURSE_TITLE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

    const { unmount: unmountViewCourse } = renderComponent(viewCourseAction);
    expect(screen.getByRole('link', { name: titleRegExp })).toBeInTheDocument();
    unmountViewCourse();

    const { unmount: unmountContinue } = renderComponent(continueAction);
    expect(screen.getByRole('link', { name: titleRegExp })).toBeInTheDocument();
    unmountContinue();

    renderComponent(viewCertificateAction);
    expect(screen.getByRole('link', { name: titleRegExp })).toBeInTheDocument();
  });

  it('is keyboard-activable through link semantics', () => {
    renderComponent(continueAction);
    const link = screen.getByRole('link', { name: /Continue/ });
    link.focus();
    expect(link).toHaveFocus();
    expect(link.tagName).toBe('A');
    expect(link).toHaveAttribute('href');
  });

  it('never renders a #, empty destination, or no-op click handler for any action kind', () => {
    [viewCourseAction, continueAction, viewCertificateAction].forEach((action) => {
      const { unmount } = renderComponent(action);
      const link = screen.getByRole('link');
      const href = link.getAttribute('href');
      expect(href).toBeTruthy();
      expect(href).not.toBe('#');
      expect(href).not.toBe('');
      unmount();
    });
  });
});
