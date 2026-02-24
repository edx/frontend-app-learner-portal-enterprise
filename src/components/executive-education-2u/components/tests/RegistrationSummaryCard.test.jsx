import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { IntlProvider } from '@edx/frontend-platform/i18n';
import RegistrationSummaryCard from '../RegistrationSummaryCard';

jest.mock('../../../course/data/utils', () => ({
  getContentPriceDisplay: jest.fn((price) => `$${price}`),
}));

jest.mock('../../../course/data/constants', () => ({
  CURRENCY_USD: 'USD',
  ZERO_PRICE: 0,
}));

jest.mock('../../../../utils/common', () => ({
  formatPrice: jest.fn(() => '$0.00'),
}));

describe('RegistrationSummaryCard', () => {
  const defaultProps = {
    priceDetails: {
      price: 200,
      currency: 'USD',
    },
  };

  const renderComponent = (props = {}) => render(
    <IntlProvider locale="en">
      <RegistrationSummaryCard {...defaultProps} {...props} />
    </IntlProvider>,
  );

  it('renders original price and zero price when hideCourseOriginalPrice is false', () => {
    renderComponent({ hideCourseOriginalPrice: false });

    // original price should be present and in a del element
    const delElement = screen.getByText('$200 USD');
    expect(delElement.tagName).toBe('DEL');

    // zero price should be present
    expect(screen.getByText('$0.00 USD')).toBeInTheDocument();
  });

  it('renders only zero price when hideCourseOriginalPrice is true', () => {
    renderComponent({ hideCourseOriginalPrice: true });

    // original price should NOT be present
    expect(screen.queryByText('$200 USD')).not.toBeInTheDocument();

    // zero price should be present
    expect(screen.getByText('$0.00 USD')).toBeInTheDocument();
  });

  it('renders "-" when priceDetails.price is falsy', () => {
    renderComponent({ priceDetails: { price: 0, currency: 'USD' } });

    // The component renders '-' when price is falsy
    // In our test, default formatPrice isn't used because price is 0 (falsy)
    // There are actually multiple elements with '-' in this case, but let's just check they are rendered.
    expect(screen.getAllByText('-').length).toBeGreaterThan(0);
  });
});
