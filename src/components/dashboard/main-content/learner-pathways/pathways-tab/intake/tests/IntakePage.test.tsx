import '@testing-library/jest-dom/extend-expect';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { IntlProvider } from '@edx/frontend-platform/i18n';
import IntakePage from '../IntakePage';
import type { IntakeFormValues } from '../IntakeQuestionsContainer';
import messages from '../messages';
import type { PathwaysFlowVariant } from '../../flowVariant';
import { PathwaysActionBarProvider } from '../../action-bar';
import { useEnterpriseCustomer } from '../../../../../../app/data';
import { enterpriseCustomerFactory } from '../../../../../../app/data/services/data/__factories__';

jest.mock('../../../../../../app/data', () => ({
  ...jest.requireActual('../../../../../../app/data'),
  useEnterpriseCustomer: jest.fn(),
}));

const MockIntakePage = ({
  onSubmit = jest.fn(),
  flowVariant,
}: { onSubmit?: (values: IntakeFormValues) => void; flowVariant?: PathwaysFlowVariant; }) => (
  <IntlProvider locale="en">
    <PathwaysActionBarProvider>
      <IntakePage onSubmit={onSubmit} flowVariant={flowVariant} />
    </PathwaysActionBarProvider>
  </IntlProvider>
);

describe('IntakePage', () => {
  beforeEach(() => {
    (useEnterpriseCustomer as jest.Mock).mockReturnValue({
      data: enterpriseCustomerFactory({ slug: 'test-enterprise' }),
    });
  });

  it('renders page shell with header and intake form', () => {
    render(<MockIntakePage />);

    expect(screen.getByTestId('intake-page')).toBeInTheDocument();
    expect(screen.getByTestId('intake-header')).toBeInTheDocument();
    expect(screen.getByTestId('intake-form')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: messages.heading.defaultMessage })).toBeInTheDocument();
    expect(screen.getByText(messages.beta.defaultMessage)).toBeInTheDocument();
  });

  it('forwards flowVariant so direct-mode copy surfaces on the submit action', () => {
    render(<MockIntakePage flowVariant="direct" />);

    expect(screen.getByRole('button', { name: messages.generateRecommendations.defaultMessage })).toBeInTheDocument();
  });
});
