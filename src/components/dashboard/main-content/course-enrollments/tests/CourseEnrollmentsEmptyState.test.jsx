import { screen } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import { IntlProvider } from '@edx/frontend-platform/i18n';

import { renderWithRouter } from '../../../../../utils/tests';
import CourseEnrollmentsEmptyState from '../CourseEnrollmentsEmptyState';
import { useAcademies, useCanOnlyViewHighlights, useEnterpriseFeatures } from '../../../../app/data';
import { useGroupAssociationsAlert } from '../data';

jest.mock('../../../../app/data', () => ({
  ...jest.requireActual('../../../../app/data'),
  useAcademies: jest.fn(),
  useCanOnlyViewHighlights: jest.fn(),
  useEnterpriseFeatures: jest.fn(),
}));

jest.mock('../data', () => ({
  ...jest.requireActual('../data'),
  useGroupAssociationsAlert: jest.fn(),
}));

jest.mock('../../../../academies/GoToAcademy', () => function MockGoToAcademy() {
  return <div>Go To Academy CTA</div>;
});
jest.mock('../../CourseRecommendations', () => function MockCourseRecommendations() {
  return <div>Course Recommendations</div>;
});
jest.mock('../NewGroupAssignmentAlert', () => function MockNewGroupAssignmentAlert({ showAlert }) {
  return showAlert ? <div>New Group Assignment Alert</div> : null;
});

const defaultEnterpriseCustomer = {
  disableSearch: false,
  enableOneAcademy: false,
  enableAcademies: false,
  slug: 'test-enterprise',
  name: 'Test Enterprise',
};

const renderComponent = () => renderWithRouter(
  <IntlProvider locale="en">
    <CourseEnrollmentsEmptyState />
  </IntlProvider>,
);

describe('CourseEnrollmentsEmptyState', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAcademies.mockReturnValue({ data: [] });
    useCanOnlyViewHighlights.mockReturnValue({ data: true });
    useEnterpriseFeatures.mockReturnValue({ data: { enterpriseGroupsV1: false } });
    useGroupAssociationsAlert.mockReturnValue({
      showNewGroupAssociationAlert: false,
      dismissGroupAssociationAlert: jest.fn(),
      enterpriseCustomer: defaultEnterpriseCustomer,
    });
  });

  it('renders GoToAcademy when one academy is enabled and exactly one academy exists', () => {
    useAcademies.mockReturnValue({ data: [{ uuid: 'academy-1' }] });
    useGroupAssociationsAlert.mockReturnValue({
      showNewGroupAssociationAlert: false,
      dismissGroupAssociationAlert: jest.fn(),
      enterpriseCustomer: {
        ...defaultEnterpriseCustomer,
        enableOneAcademy: true,
      },
    });

    renderComponent();

    expect(screen.getByText('Go To Academy CTA')).toBeInTheDocument();
  });

  it('renders the multi-academy empty state alert, CTA, and recommendations', () => {
    useCanOnlyViewHighlights.mockReturnValue({ data: false });
    useEnterpriseFeatures.mockReturnValue({ data: { enterpriseGroupsV1: true } });
    useGroupAssociationsAlert.mockReturnValue({
      showNewGroupAssociationAlert: true,
      dismissGroupAssociationAlert: jest.fn(),
      enterpriseCustomer: {
        ...defaultEnterpriseCustomer,
        enableAcademies: true,
      },
    });

    renderComponent();

    expect(screen.getByText('New Group Assignment Alert')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Explore Academies' })).toHaveAttribute('href', '/test-enterprise/search');
    expect(screen.getByText('Course Recommendations')).toBeInTheDocument();
  });

  it('renders the multi-academy CTA when academies are enabled and enterprise groups are disabled', () => {
    useGroupAssociationsAlert.mockReturnValue({
      showNewGroupAssociationAlert: true,
      dismissGroupAssociationAlert: jest.fn(),
      enterpriseCustomer: {
        ...defaultEnterpriseCustomer,
        enableAcademies: true,
      },
    });

    renderComponent();

    expect(screen.getByRole('link', { name: 'Explore Academies' })).toHaveAttribute('href', '/test-enterprise/search');
    expect(screen.queryByText('New Group Assignment Alert')).not.toBeInTheDocument();
  });

  it('does not render course recommendations when learners can only view highlight sets', () => {
    useGroupAssociationsAlert.mockReturnValue({
      showNewGroupAssociationAlert: false,
      dismissGroupAssociationAlert: jest.fn(),
      enterpriseCustomer: {
        ...defaultEnterpriseCustomer,
        enableAcademies: true,
      },
    });

    renderComponent();

    expect(screen.getByRole('link', { name: 'Explore Academies' })).toHaveAttribute('href', '/test-enterprise/search');
    expect(screen.queryByText('Course Recommendations')).not.toBeInTheDocument();
  });
});
