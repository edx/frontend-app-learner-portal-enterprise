import { forwardRef, KeyboardEvent } from 'react';
import { Button, Form } from '@openedx/paragon';
import { useIntl } from '@edx/frontend-platform/i18n';

import messages from '../messages';
import { MAX_MESSAGE_LENGTH, isSendableMessage } from '../../core/selectors';

export interface ComposerProps {
  draft: string;
  disabled: boolean;
  onDraftChange: (draft: string) => void;
  onSend: (message: string) => void;
}

const Composer = forwardRef<HTMLTextAreaElement, ComposerProps>(({
  draft, disabled, onDraftChange, onSend,
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
      className="personalized-search__composer mt-3"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <Form.Group controlId="personalized-search-composer" isInvalid={tooLong} className="mb-2">
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
      <Button type="submit" disabled={!canSend}>{intl.formatMessage(messages.send)}</Button>
    </Form>
  );
});

Composer.displayName = 'Composer';

export default Composer;
