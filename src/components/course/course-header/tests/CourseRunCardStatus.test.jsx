import { screen, render } from '@testing-library/react';
import { IntlProvider } from '@edx/frontend-platform/i18n';
import '@testing-library/jest-dom/extend-expect';

import CourseRunCardStatus from '../CourseRunCardStatus';

import { DISABLED_ENROLL_REASON_TYPES, DISABLED_ENROLL_USER_MESSAGES } from '../../data/constants';
import {
  useSubscriptions,
} from '../../../app/data';

jest.mock('../../../app/data', () => ({
  ...jest.requireActual('../../../app/data'),
  useSubscriptions: jest.fn(),
}));

const baseProps = {
  missingUserSubsidyReason: undefined,
  isUserEnrolled: false,
};

const renderCourseRunCardStatus = (props) => render(
  <IntlProvider locale="en">
    <CourseRunCardStatus {...props} />
  </IntlProvider>,
);

const mockActionTestId = 'fake-action-button';
const mockMissingUserSubsidyReason = {
  reason: 'learner_max_spend_reached',
  userMessage: 'Fake reason.',
  actions: <div data-testid={mockActionTestId} />,
};

describe('<CourseRunCardStatus />', () => {
  beforeEach(() => {
    useSubscriptions.mockReturnValue({
      data: {
        customerAgreement: {
          hasCustomLicenseExpirationMessagingV2: false,
          expiredSubscriptionModalMessaging: null,
          urlForExpiredModal: null,
          hyperLinkTextForExpiredModal: null,
        },
      },
    });
  });
  test('does not render if there is no missing subsidy reason', () => {
    const { container } = renderCourseRunCardStatus();
    expect(container).toBeEmptyDOMElement();
  });

  test('does not render if the user is already enrolled with a missing subsidy reason', () => {
    const props = {
      ...baseProps,
      missingUserSubsidyReason: mockMissingUserSubsidyReason,
      isUserEnrolled: true,
    };
    const { container } = renderCourseRunCardStatus(props);
    expect(container).toBeEmptyDOMElement();
  });

  test('renders with the message and optional actions', () => {
    const props = {
      ...baseProps,
      missingUserSubsidyReason: mockMissingUserSubsidyReason,
    };
    renderCourseRunCardStatus(props);
    expect(screen.getByText(mockMissingUserSubsidyReason.userMessage)).toBeInTheDocument();
    expect(screen.getByTestId(mockActionTestId)).toBeInTheDocument();
  });

  test('formats the message when the user message is a message descriptor', () => {
    const messageDescriptor = DISABLED_ENROLL_USER_MESSAGES[
      DISABLED_ENROLL_REASON_TYPES.LEARNER_MAX_SPEND_REACHED
    ];
    const props = {
      ...baseProps,
      missingUserSubsidyReason: {
        ...mockMissingUserSubsidyReason,
        userMessage: messageDescriptor,
      },
    };
    renderCourseRunCardStatus(props);
    expect(screen.getByText(messageDescriptor.defaultMessage)).toBeInTheDocument();
    expect(screen.getByTestId(mockActionTestId)).toBeInTheDocument();
  });

  test('does not render if the user can request a subsidy for the course', () => {
    const props = {
      ...baseProps,
      missingUserSubsidyReason: mockMissingUserSubsidyReason,
      userCanRequestSubsidyForCourse: true,
    };
    renderCourseRunCardStatus(props);
    expect(screen.queryByText(mockMissingUserSubsidyReason.userMessage)).not.toBeInTheDocument();
    expect(screen.queryByTestId(mockActionTestId)).not.toBeInTheDocument();
  });

  test('render lock status when license has been expired', () => {
    const props = {
      ...baseProps,
      missingUserSubsidyReason: mockMissingUserSubsidyReason,
    };
    useSubscriptions.mockReturnValue({
      data: {
        customerAgreement: {
          hasCustomLicenseExpirationMessagingV2: true,
        },
      },
    });
    renderCourseRunCardStatus(props);
    expect(screen.getByTestId('custom-license-expiration-message-id')).toBeInTheDocument();
  });
});
