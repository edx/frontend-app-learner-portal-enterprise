import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { IntlProvider } from '@edx/frontend-platform/i18n';
import CourseSummaryCard from '../CourseSummaryCard';
import { useMinimalCourseMetadata } from '../../../course/data';

jest.mock('../../../course/data', () => ({
  useMinimalCourseMetadata: jest.fn(),
  DATE_FORMAT: 'MMM D, YYYY',
  getContentPriceDisplay: jest.fn((price) => `$${price}`),
  ZERO_PRICE: 0,
}));

jest.mock('../../../../utils/common', () => ({
  formatPrice: jest.fn(() => '$0.00'),
}));

const mockMetadata = {
  data: {
    title: 'Test Course',
    organization: {
      name: 'Test Org',
      marketingUrl: 'http://test.org',
      logoImgUrl: 'http://test.org/logo.png',
    },
    startDate: '2023-10-01',
    duration: '6 weeks',
    priceDetails: {
      price: 100,
      currency: 'USD',
    },
  },
};

describe('CourseSummaryCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useMinimalCourseMetadata.mockReturnValue(mockMetadata);
  });

  const renderComponent = (props = {}) => render(
    <IntlProvider locale="en">
      <CourseSummaryCard {...props} />
    </IntlProvider>,
  );

  it('renders default precise price when hideCourseOriginalPrice is false', () => {
    renderComponent({ hideCourseOriginalPrice: false });

    // Test for original price displayed
    expect(screen.getByText('Test Course')).toBeInTheDocument();
    expect(screen.getByText('Test Org')).toBeInTheDocument();
    expect(screen.getByText('$100 USD')).toBeInTheDocument();
  });

  it('renders zero price when hideCourseOriginalPrice is true', () => {
    renderComponent({ hideCourseOriginalPrice: true });

    // Since mockformatPrice returns '$0.00' and ZERO_PRICE is used
    expect(screen.getByText('$0.00 USD')).toBeInTheDocument();
    // Verify that original price is not present
    expect(screen.queryByText('$100 USD')).not.toBeInTheDocument();
  });

  it('renders original price with del tag and zero price when enrollmentCompleted is true', () => {
    renderComponent({ enrollmentCompleted: true });

    // $100 USD should be present inside a del element
    const delElement = screen.getByText('$100 USD');
    expect(delElement.tagName).toBe('DEL');

    // New price is zero
    expect(screen.getByText('$0.00 USD')).toBeInTheDocument();
  });
});
