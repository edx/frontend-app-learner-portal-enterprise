import { useState } from 'react';
import {
  ActionRow, Alert, AlertModal, Button, StatefulButton,
} from '@openedx/paragon';
import { useIntl } from '@edx/frontend-platform/i18n';

import messages from '../messages';

export interface DeleteConversationModalProps {
  isOpen: boolean;
  /** Deletes the conversation; rejects when it fails, and the modal then stays open with an error. */
  onConfirm: () => Promise<void>;
  onClose: () => void;
}

/**
 * Confirms deleting a past search from History: the delete is permanent and can't be undone, and the
 * learner's saved recommendations are kept. Laid out like the dashboard's unenroll confirmation.
 */
const DeleteConversationModal = ({ isOpen, onConfirm, onClose }: DeleteConversationModalProps) => {
  const intl = useIntl();
  const [state, setState] = useState<'default' | 'pending'>('default');
  const [failed, setFailed] = useState(false);
  const close = () => {
    if (state === 'pending') { return; }
    setFailed(false);
    onClose();
  };
  const confirm = async () => {
    setState('pending');
    setFailed(false);
    try {
      await onConfirm();
      setState('default');
      onClose();
    } catch {
      setState('default');
      setFailed(true);
    }
  };
  return (
    <AlertModal
      title={intl.formatMessage(messages.historyDeleteTitle)}
      isOpen={isOpen}
      onClose={close}
      isBlocking={state === 'pending'}
      isOverflowVisible={false}
      footerNode={(
        <ActionRow>
          <Button variant="tertiary" onClick={close} disabled={state === 'pending'}>
            {intl.formatMessage(messages.historyDeleteCancel)}
          </Button>
          <StatefulButton
            variant="danger"
            state={state}
            labels={{
              default: intl.formatMessage(messages.historyDeleteConfirm),
              pending: intl.formatMessage(messages.historyDeleteDeleting),
            }}
            disabledStates={['pending']}
            onClick={confirm}
          />
        </ActionRow>
      )}
    >
      <Alert variant="danger" show={failed}>
        {intl.formatMessage(messages.historyDeleteError)}
      </Alert>
      <p className="mb-0">{intl.formatMessage(messages.historyDeleteBody)}</p>
    </AlertModal>
  );
};

export default DeleteConversationModal;
