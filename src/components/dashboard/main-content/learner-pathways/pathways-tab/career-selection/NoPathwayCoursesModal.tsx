import React, { useEffect, useRef } from 'react';
import {
  Button, Icon, ModalDialog, Stack,
} from '@openedx/paragon';
import { Search } from '@openedx/paragon/icons';
import { useIntl } from '@edx/frontend-platform/i18n';

import messages from './messages';

export interface NoPathwayCoursesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEditGoalSummary: () => void;
  triggerRef?: React.RefObject<HTMLButtonElement>;
}

const NoPathwayCoursesModal = ({
  isOpen,
  onClose,
  onEditGoalSummary,
  triggerRef,
}: NoPathwayCoursesModalProps) => {
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
      title={intl.formatMessage(messages.noCoursesTitle)}
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      hasCloseButton={false}
      isOverflowVisible={false}
      className="no-pathway-courses-modal"
    >
      <ModalDialog.Header>
        <div className="d-flex align-items-start w-100">
          <Icon
            src={Search}
            className="flex-shrink-0 mt-1 mr-2"
            aria-hidden
          />
          <ModalDialog.Title className="mb-0">
            {intl.formatMessage(messages.noCoursesTitle)}
          </ModalDialog.Title>
        </div>
      </ModalDialog.Header>

      <ModalDialog.Body>
        <p className="mb-0">
          {intl.formatMessage(messages.noCoursesBody)}
        </p>
      </ModalDialog.Body>

      <ModalDialog.Footer>
        <Stack
          direction="horizontal"
          gap={3}
          className="justify-content-end w-100"
        >
          <Button type="button" variant="tertiary" onClick={onClose}>
            {intl.formatMessage(messages.noCoursesBack)}
          </Button>

          <Button type="button" variant="primary" onClick={onEditGoalSummary}>
            {intl.formatMessage(messages.noCoursesChooseDifferentMatch)}
          </Button>
        </Stack>
      </ModalDialog.Footer>
    </ModalDialog>
  );
};

export default NoPathwayCoursesModal;
