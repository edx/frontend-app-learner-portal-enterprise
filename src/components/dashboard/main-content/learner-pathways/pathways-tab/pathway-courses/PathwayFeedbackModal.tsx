import React, { useEffect, useRef } from 'react';
import { Button, ModalDialog, Stack } from '@openedx/paragon';
import { Launch } from '@openedx/paragon/icons';
import { useIntl } from '@edx/frontend-platform/i18n';

import messages from './messages';

export interface PathwayFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGiveFeedback: () => void;
  feedbackFormUrl?: string | null;
  triggerRef?: React.RefObject<HTMLButtonElement>;
}

const PathwayFeedbackModal = ({
  isOpen,
  onClose,
  onGiveFeedback,
  feedbackFormUrl,
  triggerRef,
}: PathwayFeedbackModalProps) => {
  const intl = useIntl();

  // Return focus to the trigger element when the modal closes.
  const prevIsOpenRef = useRef(isOpen);
  useEffect(() => {
    const wasOpen = prevIsOpenRef.current;
    prevIsOpenRef.current = isOpen;
    if (wasOpen && !isOpen) {
      triggerRef?.current?.focus();
    }
  }, [isOpen, triggerRef]);

  return (
    <ModalDialog
      title={intl.formatMessage(messages.feedbackModalTitle)}
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      hasCloseButton={false}
      isOverflowVisible={false}
    >
      <ModalDialog.Header>
        <ModalDialog.Title>
          {intl.formatMessage(messages.feedbackModalTitle)}
        </ModalDialog.Title>
      </ModalDialog.Header>
      <ModalDialog.Body>
        <p>{intl.formatMessage(messages.feedbackModalBody)}</p>
        <p className="small text-gray-500 mb-0">
          {intl.formatMessage(messages.feedbackModalSupportingCopy)}
        </p>
      </ModalDialog.Body>
      <ModalDialog.Footer>
        <Stack direction="horizontal" gap={2}>
          <Button type="button" variant="tertiary" onClick={onClose}>
            {intl.formatMessage(messages.feedbackModalMaybeLater)}
          </Button>
          <Button
            as="a"
            href={feedbackFormUrl ?? undefined}
            target="_blank"
            rel="noopener noreferrer"
            variant="primary"
            iconAfter={Launch}
            onClick={onGiveFeedback}
          >
            {intl.formatMessage(messages.giveFeedback)}
            <span className="sr-only">
              {intl.formatMessage(messages.feedbackModalOpensNewTab)}
            </span>
          </Button>
        </Stack>
      </ModalDialog.Footer>
    </ModalDialog>
  );
};

export default PathwayFeedbackModal;
