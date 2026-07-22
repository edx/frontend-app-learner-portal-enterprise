import '@testing-library/jest-dom/extend-expect';
import { screen } from '@testing-library/react';
import { IntlProvider } from '@edx/frontend-platform/i18n';

import CourseEnrollmentsEmptyState from './CourseEnrollmentsEmptyState';
import { useAcademies, useEnterpriseCustomer, useEnterpriseFeatures } from '../../../app/data';
import { useGroupAssociationsAlert } from './data';
import { enterpriseCustomerFactory, academiesFactory } from '../../../app/data/services/data/__factories__';
import { renderWithRouter } from '../../../../utils/tests';

jest.mock('../../../app/data', () => ({
  ...jest.requireActual('../../../app/data'),
  useAcademies: jest.fn(),
  useEnterpriseCustomer: jest.fn(),
  useEnterpriseFeatures: jest.fn(),
}));

jest.mock('./data', () => ({
  ...jest.requireActual('./data'),
  useGroupAssociationsAlert: jest.fn(),
}));

const mockEnterpriseCustomer = enterpriseCustomerFactory({ slug: 'test-enterprise' });

const mockGroupAssociationsAlert = (overrides = {}) => {
  useGroupAssociationsAlert.mockReturnValue({
    showNewGroupAssociationAlert: false,
    dismissGroupAssociationAlert: jest.fn(),
    enterpriseCustomer: mockEnterpriseCustomer,
    ...overrides,
  });
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
    useEnterpriseCustomer.mockReturnValue({ data: mockEnterpriseCustomer });
    useEnterpriseFeatures.mockReturnValue({ data: { enterpriseGroupsV1: false } });
    mockGroupAssociationsAlert();
  });

  it('renders the disableSearch message and nothing else when search is disabled', () => {
    mockGroupAssociationsAlert({
      enterpriseCustomer: { ...mockEnterpriseCustomer, disableSearch: true, name: 'Test Org' },
    });

    renderComponent();

    expect(screen.getByText('You are not enrolled in any courses sponsored by Test Org. Reach out to your administrator for instructions on how to start learning with edX!', { exact: false })).toBeInTheDocument();
    expect(screen.queryByText('No courses registered yet')).not.toBeInTheDocument();
  });

  it('renders GoToAcademy when the customer has exactly one academy', () => {
    mockGroupAssociationsAlert({
      enterpriseCustomer: { ...mockEnterpriseCustomer, enableOneAcademy: true },
    });
    useAcademies.mockReturnValue({ data: academiesFactory(1) });

    renderComponent();

    expect(screen.getByText('Go to Academy')).toBeInTheDocument();
    expect(screen.queryByText('No courses registered yet')).not.toBeInTheDocument();
  });

  it('renders the new group assignment alert alongside the generic message when enterpriseGroupsV1 is enabled', () => {
    useEnterpriseFeatures.mockReturnValue({ data: { enterpriseGroupsV1: true } });
    mockGroupAssociationsAlert({ showNewGroupAssociationAlert: true });

    renderComponent();

    expect(screen.getByText('You have new courses to browse')).toBeInTheDocument();
    expect(screen.getByText('No courses registered yet')).toBeInTheDocument();
  });

  it('renders the redesigned generic empty state with no Find a course button and no course recommendations', () => {
    renderComponent();

    expect(screen.getByText('No courses registered yet')).toBeInTheDocument();
    expect(screen.getByText(/Once you enroll in a course/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Find a course' })).not.toBeInTheDocument();
    expect(screen.queryByText('Recommend courses for me')).not.toBeInTheDocument();

    const exploreLink = screen.getByRole('link', { name: 'exploring courses' });
    expect(exploreLink).toHaveAttribute('href', '/test-enterprise/search');
  });
});
