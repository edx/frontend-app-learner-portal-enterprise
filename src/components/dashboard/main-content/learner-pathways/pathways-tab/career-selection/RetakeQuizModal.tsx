import React, { useEffect, useRef } from 'react';
import { Button, ModalDialog, Stack } from '@openedx/paragon';
import { useIntl } from '@edx/frontend-platform/i18n';

import messages from './messages';

export interface RetakeQuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  triggerRef?: React.RefObject<HTMLElement>;
}

const RetakeQuizModal = ({
  isOpen,
  onClose,
  onConfirm,
  triggerRef,
}: RetakeQuizModalProps) => {
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
      title={intl.formatMessage(messages.retakeQuizTitle)}
      isOpen={isOpen}
      onClose={onClose}
      hasCloseButton={false}
      isOverflowVisible={false}
    >
      <ModalDialog.Header>
        <ModalDialog.Title>
          {intl.formatMessage(messages.retakeQuizTitle)}
        </ModalDialog.Title>
      </ModalDialog.Header>
      <ModalDialog.Body>
        <p className="mb-0">{intl.formatMessage(messages.retakeQuizBody)}</p>
      </ModalDialog.Body>
      <ModalDialog.Footer>
        <Stack direction="horizontal" gap={2}>
          <Button type="button" variant="tertiary" onClick={onClose}>
            {intl.formatMessage(messages.retakeQuizCancel)}
          </Button>
          <Button type="button" variant="primary" onClick={onConfirm}>
            {intl.formatMessage(messages.retakeQuiz)}
          </Button>
        </Stack>
      </ModalDialog.Footer>
    </ModalDialog>
  );
};

export default RetakeQuizModal;
