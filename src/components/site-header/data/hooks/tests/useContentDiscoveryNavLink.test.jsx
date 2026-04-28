import { screen } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import { IntlProvider } from '@edx/frontend-platform/i18n';

import { renderWithRouter } from '../../../../../utils/tests';
import useContentDiscoveryNavLink from '../useContentDiscoveryNavLink';
import { useAcademies, useEnterpriseCustomer } from '../../../../app/data';
import {
  academiesFactory,
  enterpriseCustomerFactory,
} from '../../../../app/data/services/data/__factories__';

jest.mock('../../../../app/data', () => ({
  ...jest.requireActual('../../../../app/data'),
  useEnterpriseCustomer: jest.fn(),
  useAcademies: jest.fn(),
}));

const TestComponent = ({ className }) => {
  const navLink = useContentDiscoveryNavLink(className);
  return <nav>{navLink}</nav>;
};

describe('useContentDiscoveryNavLink', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders "Find a Course" link when enableAcademies and enableOneAcademy are both false', () => {
    const mockCustomer = enterpriseCustomerFactory({
      enable_academies: false,
      enable_one_academy: false,
    });
    useEnterpriseCustomer.mockReturnValue({ data: mockCustomer });
    useAcademies.mockReturnValue({ data: [] });

    renderWithRouter(
      <IntlProvider locale="en">
        <TestComponent className="nav-link" />
      </IntlProvider>,
    );

    expect(screen.getByText('Find a Course')).toBeInTheDocument();
    expect(screen.getByText('Find a Course').closest('a')).toHaveAttribute(
      'href',
      `/${mockCustomer.slug}/search`,
    );
  });

  it('renders "Go to Academy" link when enableOneAcademy is true and there is exactly one academy', () => {
    const [academy] = academiesFactory(1);
    const mockCustomer = enterpriseCustomerFactory({ enable_one_academy: true });
    useEnterpriseCustomer.mockReturnValue({ data: mockCustomer });
    useAcademies.mockReturnValue({ data: [academy] });

    renderWithRouter(
      <IntlProvider locale="en">
        <TestComponent className="nav-link" />
      </IntlProvider>,
    );

    expect(screen.getByText('Go to Academy')).toBeInTheDocument();
    expect(screen.getByText('Go to Academy').closest('a')).toHaveAttribute(
      'href',
      `/${mockCustomer.slug}/academies/${academy.uuid}`,
    );
  });

  it('renders "Find a Course" link when enableOneAcademy is true but there are no academies', () => {
    const mockCustomer = enterpriseCustomerFactory({ enable_one_academy: true });
    useEnterpriseCustomer.mockReturnValue({ data: mockCustomer });
    useAcademies.mockReturnValue({ data: [] });

    renderWithRouter(
      <IntlProvider locale="en">
        <TestComponent className="nav-link" />
      </IntlProvider>,
    );

    expect(screen.getByText('Find a Course')).toBeInTheDocument();
  });

  it('renders "Academies" link when enableAcademies is true and enableOneAcademy is false', () => {
    const mockCustomer = enterpriseCustomerFactory({
      enable_academies: true,
      enable_one_academy: false,
    });
    useEnterpriseCustomer.mockReturnValue({ data: mockCustomer });
    useAcademies.mockReturnValue({ data: academiesFactory(3) });

    renderWithRouter(
      <IntlProvider locale="en">
        <TestComponent className="nav-link" />
      </IntlProvider>,
    );

    expect(screen.getByText('Academies')).toBeInTheDocument();
    expect(screen.getByText('Academies').closest('a')).toHaveAttribute(
      'href',
      `/${mockCustomer.slug}/search`,
    );
  });

  it('renders "Academies" link even when there are no academies loaded yet (enableAcademies true)', () => {
    const mockCustomer = enterpriseCustomerFactory({
      enable_academies: true,
      enable_one_academy: false,
    });
    useEnterpriseCustomer.mockReturnValue({ data: mockCustomer });
    useAcademies.mockReturnValue({ data: [] });

    renderWithRouter(
      <IntlProvider locale="en">
        <TestComponent className="nav-link" />
      </IntlProvider>,
    );

    expect(screen.getByText('Academies')).toBeInTheDocument();
  });

  it('applies the provided className to the nav link', () => {
    const mockCustomer = enterpriseCustomerFactory({
      enable_academies: true,
      enable_one_academy: false,
    });
    useEnterpriseCustomer.mockReturnValue({ data: mockCustomer });
    useAcademies.mockReturnValue({ data: academiesFactory(2) });

    renderWithRouter(
      <IntlProvider locale="en">
        <TestComponent className="custom-link-class" />
      </IntlProvider>,
    );

    expect(screen.getByText('Academies').closest('a')).toHaveClass('custom-link-class');
  });
});
