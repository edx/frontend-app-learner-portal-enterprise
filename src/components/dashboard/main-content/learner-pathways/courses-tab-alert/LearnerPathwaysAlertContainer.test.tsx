import '@testing-library/jest-dom/extend-expect';
import { render, screen } from '@testing-library/react';
import { IntlProvider } from '@edx/frontend-platform/i18n';

import LearnerPathwaysAlertContainer from './LearnerPathwaysAlertContainer';
import { usePathwaysStore } from '../pathways-tab/state';
import { useEnterpriseCourseEnrollments, useEnterpriseCustomer } from '../../../../app/data';
import { enterpriseCustomerFactory } from '../../../../app/data/services/data/__factories__';

jest.mock('../../../../app/data', () => ({
  ...jest.requireActual('../../../../app/data'),
  useEnterpriseCustomer: jest.fn(),
  useEnterpriseCourseEnrollments: jest.fn(),
}));

const mockEnterpriseCustomer = enterpriseCustomerFactory({ slug: 'test-enterprise' });

const renderComponent = (props = {}) => render(
  <IntlProvider locale="en">
    <LearnerPathwaysAlertContainer onSelectTab={jest.fn()} hasPathwaysTab {...props} />
  </IntlProvider>,
);

describe('LearnerPathwaysAlertContainer', () => {
  beforeEach(() => {
    usePathwaysStore.getState().resetPathwaysState();
    global.localStorage.clear();
    (useEnterpriseCustomer as jest.Mock).mockReturnValue({ data: mockEnterpriseCustomer });
    (useEnterpriseCourseEnrollments as jest.Mock).mockReturnValue({
      data: { enterpriseCourseEnrollments: [] },
    });
  });

  it('renders the not_started state end-to-end when the store is empty', () => {
    renderComponent();

    expect(screen.getByText('Ready to start your learning journey?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Take onboarding quiz' })).toBeInTheDocument();
  });

  it('renders the course_registered state end-to-end when a pathway course has a matching in-progress enrollment', () => {
    usePathwaysStore.setState({
      pathwayCourses: [{ courseKey: 'course-1', title: 'Course 1', status: 'not_started' }],
    });
    (useEnterpriseCourseEnrollments as jest.Mock).mockReturnValue({
      data: {
        enterpriseCourseEnrollments: [{
          courseKey: 'course-1',
          courseRunId: 'course-1-run',
          courseRunStatus: 'in_progress',
          isEnrollmentActive: true,
          isRevoked: false,
          created: '2026-01-01T00:00:00Z',
        }],
      },
    });

    renderComponent();

    expect(screen.getByText('Your learning pathway')).toBeInTheDocument();
    expect(screen.getByText(/1\/1 courses in progress/)).toBeInTheDocument();
  });
});
