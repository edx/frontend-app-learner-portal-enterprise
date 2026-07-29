import '@testing-library/jest-dom/extend-expect';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntlProvider } from '@edx/frontend-platform/i18n';
import { sendEnterpriseTrackEvent } from '@2uinc/frontend-enterprise-utils';
import IntakeIntroCollapsible from '../IntakeIntroCollapsible';
import messages from '../messages';
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

const mockEnterpriseCustomer = enterpriseCustomerFactory({ slug: 'test-enterprise' });

const MockIntakeIntroCollapsible = () => (
  <IntlProvider locale="en">
    <IntakeIntroCollapsible />
  </IntlProvider>
);

describe('IntakeIntroCollapsible', () => {
  beforeEach(() => {
    (useEnterpriseCustomer as jest.Mock).mockReturnValue({ data: mockEnterpriseCustomer });
  });

  it('expands and collapses translated intro content', async () => {
    const user = userEvent.setup();
    render(<MockIntakeIntroCollapsible />);

    const toggle = screen.getByRole('button', { name: messages.introCollapsibleTitle.defaultMessage });

    if (toggle.getAttribute('aria-expanded') !== 'true') {
      await user.click(toggle);
    }
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText(messages.introStepOneBody.defaultMessage)).toBeInTheDocument();

    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  it('fires control.interacted with sourceComponent "intake_intro_collapsible" on open and close', async () => {
    const user = userEvent.setup();
    render(<MockIntakeIntroCollapsible />);
    const toggle = screen.getByRole('button', { name: messages.introCollapsibleTitle.defaultMessage });

    await user.click(toggle);
    expect(sendEnterpriseTrackEvent).toHaveBeenCalledWith(
      mockEnterpriseCustomer.uuid,
      PATHWAYS_EVENTS.CONTROL_INTERACTED,
      expect.objectContaining({ sourceComponent: 'intake_intro_collapsible', interactionAction: 'opened' }),
    );

    await user.click(toggle);
    expect(sendEnterpriseTrackEvent).toHaveBeenCalledWith(
      mockEnterpriseCustomer.uuid,
      PATHWAYS_EVENTS.CONTROL_INTERACTED,
      expect.objectContaining({ sourceComponent: 'intake_intro_collapsible', interactionAction: 'dismissed' }),
    );
  });
});
