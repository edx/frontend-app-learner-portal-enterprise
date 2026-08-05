import '@testing-library/jest-dom/extend-expect';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { IntlProvider } from '@edx/frontend-platform/i18n';
import { sendEnterpriseTrackEvent } from '@2uinc/frontend-enterprise-utils';

import PathwayCourseActionButton from '../PathwayCourseActionButton';
import type { ResolvedPathwayCourseAction } from '../resolvePathwayCourses';
import { usePathwaysStore } from '../../state';
import { useEnterpriseCustomer } from '../../../../../../app/data';
import { enterpriseCustomerFactory } from '../../../../../../app/data/services/data/__factories__';
import { PATHWAYS_EVENTS } from '../../../../../../../eventTracking';

jest.mock('../../../../../../app/data', () => ({
  ...jest.requireActual('../../../../../../app/data'),
  useEnterpriseCustomer: jest.fn(),
}));
jest.mock('@2uinc/frontend-enterprise-utils', () => ({
  ...jest.requireActual('@2uinc/frontend-enterprise-utils'),
  sendEnterpriseTrackEvent: jest.fn(),
}));

const COURSE_TITLE = 'Financial Analysis & Evaluation';
const COURSE_KEY = 'edX+FA101';
const mockEnterpriseCustomer = enterpriseCustomerFactory({ slug: 'test-enterprise' });

const renderComponent = (
  action: ResolvedPathwayCourseAction,
  courseStatus: 'not_started' | 'in_progress' | 'completed' = 'not_started',
  extraProps: { coursePosition?: number; hasRecommendationExplanation?: boolean } = {},
) => render(
  <MemoryRouter>
    <IntlProvider locale="en">
      <PathwayCourseActionButton
        action={action}
        courseKey={COURSE_KEY}
        courseTitle={COURSE_TITLE}
        courseStatus={courseStatus}
        coursePosition={extraProps.coursePosition ?? 0}
        hasRecommendationExplanation={extraProps.hasRecommendationExplanation ?? false}
      />
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
  beforeEach(() => {
    usePathwaysStore.getState().resetPathwaysState();
    (useEnterpriseCustomer as jest.Mock).mockReturnValue({ data: mockEnterpriseCustomer });
    (sendEnterpriseTrackEvent as jest.Mock).mockClear();
  });

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

  describe('pathways.course.clicked analytics', () => {
    it('fires with the courseKey, actionKind, and courseStatus for an in-app view_course click', async () => {
      const user = userEvent.setup();
      renderComponent(viewCourseAction, 'not_started');

      await user.click(screen.getByRole('link', { name: /View Course/ }));

      expect(sendEnterpriseTrackEvent).toHaveBeenCalledTimes(1);
      expect(sendEnterpriseTrackEvent).toHaveBeenCalledWith(
        mockEnterpriseCustomer.uuid,
        PATHWAYS_EVENTS.COURSE_CLICKED,
        expect.objectContaining({ courseKey: COURSE_KEY, actionKind: 'view_course', courseStatus: 'not_started' }),
      );
    });

    it('fires with courseStatus in_progress for a continue click', async () => {
      const user = userEvent.setup();
      renderComponent(continueAction, 'in_progress');

      await user.click(screen.getByRole('link', { name: /Continue/ }));

      expect(sendEnterpriseTrackEvent).toHaveBeenCalledWith(
        mockEnterpriseCustomer.uuid,
        PATHWAYS_EVENTS.COURSE_CLICKED,
        expect.objectContaining({ courseKey: COURSE_KEY, actionKind: 'continue', courseStatus: 'in_progress' }),
      );
    });

    it('fires for the external view_certificate action without preventing the new-tab navigation', async () => {
      const user = userEvent.setup();
      renderComponent(viewCertificateAction, 'completed');
      const link = screen.getByRole('link', { name: /View Certificate/ });

      await user.click(link);

      expect(sendEnterpriseTrackEvent).toHaveBeenCalledWith(
        mockEnterpriseCustomer.uuid,
        PATHWAYS_EVENTS.COURSE_CLICKED,
        expect.objectContaining({ courseKey: COURSE_KEY, actionKind: 'view_certificate', courseStatus: 'completed' }),
      );
      expect(link).toHaveAttribute('href', viewCertificateAction.destination);
      expect(link).toHaveAttribute('target', '_blank');
    });

    it('includes courseTitle, coursePosition, and hasRecommendationExplanation', async () => {
      const user = userEvent.setup();
      renderComponent(viewCourseAction, 'not_started', { coursePosition: 2, hasRecommendationExplanation: true });

      await user.click(screen.getByRole('link', { name: /View Course/ }));

      expect(sendEnterpriseTrackEvent).toHaveBeenCalledWith(
        mockEnterpriseCustomer.uuid,
        PATHWAYS_EVENTS.COURSE_CLICKED,
        expect.objectContaining({
          courseTitle: COURSE_TITLE,
          coursePosition: 2,
          hasRecommendationExplanation: true,
        }),
      );
    });

    it('includes the common pathways context (pathwayStep, schema version, selected-career/skill/pathway state)', async () => {
      const user = userEvent.setup();
      renderComponent(viewCourseAction);

      await user.click(screen.getByRole('link', { name: /View Course/ }));

      expect(sendEnterpriseTrackEvent).toHaveBeenCalledWith(
        mockEnterpriseCustomer.uuid,
        PATHWAYS_EVENTS.COURSE_CLICKED,
        expect.objectContaining({
          pathwayStep: 'onboarding',
          pathwaysSchemaVersion: 1,
          selectedCareerId: null,
          selectedCareerName: null,
          selectedSkillCount: null,
          pathwayCourseCount: 0,
        }),
      );
    });
  });
});
