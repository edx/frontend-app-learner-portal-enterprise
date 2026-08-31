import { screen } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import { IntlProvider } from '@edx/frontend-platform/i18n';

import { renderWithRouter } from '../../../../../utils/tests';
import useContentDiscoveryNavLink from '../useContentDiscoveryNavLink';
import { useAcademies, useCanViewAcademies, useEnterpriseCustomer } from '../../../../app/data';
import {
  academiesFactory,
  enterpriseCustomerFactory,
} from '../../../../app/data/services/data/__factories__';

jest.mock('../../../../app/data', () => ({
  ...jest.requireActual('../../../../app/data'),
  useAcademies: jest.fn(),
  useCanViewAcademies: jest.fn(),
  useEnterpriseCustomer: jest.fn(),
}));

const mockEnterpriseCustomer = enterpriseCustomerFactory({
  enable_academies: true,
  enable_one_academy: true,
});

const ContentDiscoveryNavLink = () => useContentDiscoveryNavLink('nav-link');

const renderNavLink = () => renderWithRouter(
  <IntlProvider locale="en">
    <ContentDiscoveryNavLink />
  </IntlProvider>,
);

describe('useContentDiscoveryNavLink', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useEnterpriseCustomer.mockReturnValue({ data: mockEnterpriseCustomer });
    useCanViewAcademies.mockReturnValue(true);
    useAcademies.mockReturnValue({ data: academiesFactory(1) });
  });

  it('renders the "Go to Academy" link for an eligible one-academy customer', () => {
    const [academy] = academiesFactory(1);
    useAcademies.mockReturnValue({ data: [academy] });

    renderNavLink();

    const link = screen.getByRole('link', { name: 'Go to Academy' });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', `/${mockEnterpriseCustomer.slug}/academies/${academy.uuid}`);
    expect(screen.queryByRole('link', { name: 'Find a Course' })).not.toBeInTheDocument();
  });

  it('renders the "Find a Course" link for academy-ineligible learners', () => {
    useCanViewAcademies.mockReturnValue(false);

    renderNavLink();

    const link = screen.getByRole('link', { name: 'Find a Course' });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', `/${mockEnterpriseCustomer.slug}/search`);
    expect(screen.queryByRole('link', { name: 'Go to Academy' })).not.toBeInTheDocument();
  });

  it('does not fetch the academies list for academy-ineligible learners', () => {
    useCanViewAcademies.mockReturnValue(false);

    renderNavLink();

    expect(useAcademies).not.toHaveBeenCalled();
  });

  it('renders the "Find a Course" link when one-academy is not enabled', () => {
    useEnterpriseCustomer.mockReturnValue({
      data: enterpriseCustomerFactory({ enable_academies: true, enable_one_academy: false }),
    });

    renderNavLink();

    expect(screen.getByRole('link', { name: 'Find a Course' })).toBeInTheDocument();
    expect(useAcademies).not.toHaveBeenCalled();
  });

  it('renders the "Find a Course" link when the customer does not have exactly one academy', () => {
    useAcademies.mockReturnValue({ data: academiesFactory(3) });

    renderNavLink();

    expect(screen.getByRole('link', { name: 'Find a Course' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Go to Academy' })).not.toBeInTheDocument();
  });
});
