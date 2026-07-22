import '@testing-library/jest-dom/extend-expect';
import React, { Suspense } from 'react';
import {
  act, render, screen, waitFor, within,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { IntlProvider } from '@edx/frontend-platform/i18n';
import { mergeConfig } from '@edx/frontend-platform';
import { getAuthenticatedUser } from '@edx/frontend-platform/auth';

import PathwayCoursesContainer from './PathwayCoursesContainer';
import { PathwaysActionBarProvider } from './action-bar';
import { usePathwaysStore } from './state';
import useEnterpriseCustomer from '../../../../app/data/hooks/useEnterpriseCustomer';
import useBrowseAndRequest from '../../../../app/data/hooks/useBrowseAndRequest';
import useRedeemablePolicies from '../../../../app/data/hooks/useRedeemablePolicies';
import { queryEnterpriseCourseEnrollments } from '../../../../app/data/queries';
import { enterpriseCustomerFactory } from '../../../../app/data/services/data/__factories__';
import { queryClient } from '../../../../../utils/tests';

// This suite exercises the REAL useEnterpriseCourseEnrollments hook (and the real
// TanStack Query cache subscription behind it) rather than mocking it, to prove the
// Pathway container reacts to enrollment cache updates. Only the true external
// boundaries — the active enterprise customer and the sibling subsidy-request/
// redeemable-policy queries useEnterpriseCourseEnrollments fans out to — are mocked.
// These are mocked at their own module paths (not the `app/data` barrel) because
// useEnterpriseCourseEnrollments.js imports each of them directly from its sibling
// file, bypassing the barrel entirely.
jest.mock('../../../../app/data/hooks/useEnterpriseCustomer');
jest.mock('../../../../app/data/hooks/useBrowseAndRequest');
jest.mock('../../../../app/data/hooks/useRedeemablePolicies');
jest.mock('@edx/frontend-platform/auth');

const TEST_UUID = 'test-enterprise-uuid';
const RUN_ID = 'course-v1:edX+CF+2024';

const mockEnterpriseCustomer = enterpriseCustomerFactory({
  uuid: TEST_UUID,
  slug: 'test-enterprise',
  contact_email: 'admin@example.com',
});

// The query cache holds data in the shape the real queryFn would return post-fetch —
// already camelCased (the service layer applies camelCaseObject to the raw API JSON
// before this point) — which is exactly the shape transformCourseEnrollment expects
// as input (it reads `resumeCourseRunUrl`/`certificateDownloadUrl`, not snake_case).
const cachedInProgressEnrollment = {
  courseKey: 'corporate-finance',
  courseRunId: RUN_ID,
  courseRunStatus: 'in_progress',
  isEnrollmentActive: true,
  isRevoked: false,
  created: '2026-01-10T00:00:00Z',
  resumeCourseRunUrl: 'https://learning.edx.org/course/course-v1:edX+CF+2024/resume',
  certificateDownloadUrl: null,
  title: 'Introduction to Corporate Finance',
};

describe('PathwayCoursesContainer TanStack Query cache reactivity', () => {
  let client: ReturnType<typeof queryClient>;

  beforeEach(() => {
    usePathwaysStore.getState().resetPathwaysState();
    usePathwaysStore.setState({
      pathwayCourses: [
        { courseKey: 'corporate-finance', title: 'Introduction to Corporate Finance', status: 'not_started' },
      ],
    });
    global.localStorage.clear();
    mergeConfig({ PATHWAYS_FEEDBACK_FORM_URL: null });

    (useEnterpriseCustomer as jest.Mock).mockReturnValue({ data: mockEnterpriseCustomer });
    (useBrowseAndRequest as jest.Mock).mockReturnValue({ data: { requests: {} } });
    (useRedeemablePolicies as jest.Mock).mockReturnValue({
      data: { assignments: {}, transformedRequests: [] },
    });
    (getAuthenticatedUser as jest.Mock).mockReturnValue({ username: 'test-learner' });

    client = queryClient();
    client.setQueryData(
      queryEnterpriseCourseEnrollments(TEST_UUID).queryKey,
      [cachedInProgressEnrollment],
    );
  });

  const renderComponent = () => render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <IntlProvider locale="en">
          <PathwaysActionBarProvider>
            <Suspense fallback={<div>Loading...</div>}>
              <PathwayCoursesContainer />
            </Suspense>
          </PathwaysActionBarProvider>
        </IntlProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );

  it('updates the row and progress presentation when the enrollment cache changes, without regenerating the pathway', async () => {
    renderComponent();

    const table = await screen.findByRole('table');
    await waitFor(() => expect(within(table).getByText('In progress')).toBeInTheDocument());
    expect(screen.getByRole('link', { name: /Continue/ }))
      .toHaveAttribute('href', cachedInProgressEnrollment.resumeCourseRunUrl);

    const coursesRefBefore = usePathwaysStore.getState().pathwayCourses;
    const fingerprintBefore = usePathwaysStore.getState().pathwayInputFingerprint;
    const persistedBefore = global.localStorage.getItem('edx.learner-pathways.state');

    // Mirrors (not re-tests) the exact cache-write mechanism useUpdateCourseEnrollmentStatus
    // uses (queryClient.setQueryData on this same legacy query key) — see
    // src/components/dashboard/main-content/course-enrollments/data/hooks.js.
    act(() => {
      client.setQueryData(
        queryEnterpriseCourseEnrollments(TEST_UUID).queryKey,
        (old: typeof cachedInProgressEnrollment[]) => old.map((enrollment) => (
          enrollment.courseRunId === RUN_ID
            ? {
              ...enrollment,
              courseRunStatus: 'completed',
              certificateDownloadUrl: 'https://courses.edx.org/certificates/abc123',
            }
            : enrollment
        )),
      );
    });

    await waitFor(() => expect(within(table).getByText('Completed')).toBeInTheDocument());
    expect(screen.getByRole('link', { name: /View Certificate/ }))
      .toHaveAttribute('href', 'https://courses.edx.org/certificates/abc123');

    expect(usePathwaysStore.getState().pathwayCourses).toBe(coursesRefBefore);
    expect(usePathwaysStore.getState().pathwayInputFingerprint).toBe(fingerprintBefore);
    expect(global.localStorage.getItem('edx.learner-pathways.state')).toBe(persistedBefore);
  });
});
