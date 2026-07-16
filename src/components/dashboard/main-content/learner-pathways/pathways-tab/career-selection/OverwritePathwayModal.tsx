import React, { useEffect, useRef } from 'react';
import { Button, ModalDialog, Stack } from '@openedx/paragon';
import { useIntl } from '@edx/frontend-platform/i18n';

import messages from './messages';

export interface OverwritePathwayModalProps {
  isOpen: boolean;
  isBuildingPathway?: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  triggerRef?: React.RefObject<HTMLButtonElement>;
}

const OverwritePathwayModal = ({
  isOpen,
  isBuildingPathway = false,
  onClose,
  onConfirm,
  triggerRef,
}: OverwritePathwayModalProps) => {
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
      title={intl.formatMessage(messages.overwriteTitle)}
      isOpen={isOpen}
      onClose={onClose}
      hasCloseButton={false}
      isBlocking={isBuildingPathway}
      isOverflowVisible={false}
    >
      <ModalDialog.Header className="pb-0">
        <ModalDialog.Title>
          {intl.formatMessage(messages.overwriteTitle)}
        </ModalDialog.Title>
      </ModalDialog.Header>
      <ModalDialog.Body>
        <p>{intl.formatMessage(messages.overwriteBodyPathway)}</p>
        <p className="mb-0">{intl.formatMessage(messages.overwriteBodyCourses)}</p>
      </ModalDialog.Body>
      <ModalDialog.Footer>
        <Stack direction="horizontal" gap={2}>
          <Button
            type="button"
            variant="tertiary"
            onClick={onClose}
            disabled={isBuildingPathway}
          >
            {intl.formatMessage(messages.overwriteCancel)}
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={async () => {
              try {
                await onConfirm();
              } catch {
              // Error state is owned by the parent container; keep modal open for retry.
              }
            }}
            disabled={isBuildingPathway}
          >
            {intl.formatMessage(messages.overwriteConfirm)}
          </Button>
        </Stack>
      </ModalDialog.Footer>
    </ModalDialog>
  );
};

export default OverwritePathwayModal;
