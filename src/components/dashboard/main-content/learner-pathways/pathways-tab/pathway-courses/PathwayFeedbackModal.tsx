import React from 'react';
import { Button, ModalDialog, Stack } from '@openedx/paragon';
import { Launch } from '@openedx/paragon/icons';
import { useIntl } from '@edx/frontend-platform/i18n';

import messages from './messages';
import sharedMessages from '../shared/messages';

export interface PathwayFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGiveFeedback: () => void;
  feedbackFormUrl?: string | null;
}

/**
 * The one-time, 15-seconds-after-first-generated-pathway auto-popup. Always blocking
 * (no Escape/backdrop dismiss) — the learner must explicitly act via "Maybe later" or
 * the in-modal link, since nothing else opens this modal for focus to return to.
 */
const PathwayFeedbackModal = ({
  isOpen,
  onClose,
  onGiveFeedback,
  feedbackFormUrl,
}: PathwayFeedbackModalProps) => {
  const intl = useIntl();

  return (
    <ModalDialog
      title={intl.formatMessage(messages.feedbackModalTitle)}
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      hasCloseButton
      isBlocking
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
            {intl.formatMessage(sharedMessages.giveFeedback)}
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
