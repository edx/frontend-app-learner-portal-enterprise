import { forwardRef, KeyboardEvent, Ref } from 'react';
import {
  Button, Form, Icon, Stack,
} from '@openedx/paragon';
import { Send } from '@openedx/paragon/icons';
import { useIntl } from '@edx/frontend-platform/i18n';

import messages from '../messages';
import { MAX_MESSAGE_LENGTH, isSendableMessage } from '../../core/selectors';

export interface ComposerProps {
  draft: string;
  disabled: boolean;
  onDraftChange: (draft: string) => void;
  onSend: (message: string) => void;
  /** Shown instead of Send while a turn is in progress. */
  onStop: () => void;
  /** The Stop button, the composer's one focusable control while the textarea is disabled. */
  stopRef: Ref<HTMLButtonElement>;
}

const Composer = forwardRef<HTMLTextAreaElement, ComposerProps>(({
  draft, disabled, onDraftChange, onSend, onStop, stopRef,
}, ref) => {
  const intl = useIntl();
  const tooLong = draft.trim().length > MAX_MESSAGE_LENGTH;
  const canSend = !disabled && isSendableMessage(draft);

  const submit = () => {
    if (canSend) { onSend(draft.trim()); }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  };

  return (
    <Form
      className="personalized-search__composer mt-2"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <Stack direction="horizontal" gap={2} className="align-items-start">
        <Form.Group controlId="personalized-search-composer" isInvalid={tooLong} className="mb-0 flex-grow-1">
          <Form.Label className="sr-only">{intl.formatMessage(messages.composerLabel)}</Form.Label>
          <Form.Control
            as="textarea"
            rows={2}
            ref={ref}
            value={draft}
            disabled={disabled}
            placeholder={intl.formatMessage(messages.composerPlaceholder)}
            onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => onDraftChange(event.target.value)}
            onKeyDown={onKeyDown}
          />
          {tooLong && (
            <Form.Control.Feedback type="invalid">{intl.formatMessage(messages.messageTooLong)}</Form.Control.Feedback>
          )}
        </Form.Group>
        {disabled ? (
          <Button ref={stopRef} variant="outline-primary" onClick={onStop}>{intl.formatMessage(messages.stop)}</Button>
        ) : (
          <Button type="submit" disabled={!canSend} aria-label={intl.formatMessage(messages.send)}>
            <Icon src={Send} />
          </Button>
        )}
      </Stack>
    </Form>
  );
});

Composer.displayName = 'Composer';

export default Composer;
