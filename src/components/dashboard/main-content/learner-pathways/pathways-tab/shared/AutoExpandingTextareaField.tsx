import React, { useCallback, useEffect, useRef } from 'react';
import classNames from 'classnames';
import { Form } from '@openedx/paragon';
import { useIntl } from '@edx/frontend-platform/i18n';
import { useController } from 'react-hook-form';
import type {
  Control, FieldValues, Path, RegisterOptions,
} from 'react-hook-form';
import messages from './messages';

/**
 * Props for a generic auto-expanding textarea integrated with React Hook Form.
 *
 * @property name - RHF field name within the form values.
 * @property control - RHF Control object from useForm / useFormContext.
 * @property rules - Optional RHF validation rules. A maxCharacters rule is merged in automatically
 *   when {@link maxCharacters} is provided.
 * @property controlId - Unique Paragon Form.Group identifier for label association.
 * @property label - Visible label text rendered above the textarea.
 * @property labelClassName - Optional className applied to a span wrapping the label text,
 *   e.g. "h3" to use heading sizing for the label.
 * @property placeholder - Placeholder text shown when the field is empty.
 * @property maxCharacters - When provided, enables the character counter and blocks submission
 *   when the current length exceeds this value.
 * @property disabled - Disables the textarea when true.
 * @property className - Optional className passed to the wrapping Form.Group element.
 * @property fieldTestId - data-testid applied to the textarea control.
 * @property feedbackTestId - data-testid applied to the validation feedback element.
 */
interface AutoExpandingTextareaFieldProps<
  TFieldValues extends FieldValues,
  TName extends Path<TFieldValues>,
> {
  name: TName;
  control: Control<TFieldValues>;
  rules?: RegisterOptions<TFieldValues, TName>;
  controlId: string;
  label: string;
  labelClassName?: string;
  placeholder?: string;
  maxCharacters?: number;
  disabled?: boolean;
  className?: string;
  fieldTestId?: string;
  feedbackTestId?: string;
}

/**
 * Generic auto-expanding textarea backed by React Hook Form's (RHF) useController
 *
 * Responsibilities:
 * - Bind to a RHF form field via control + name.
 * - Expand and shrink vertically as content changes, including pre-filled values.
 * - Render a Paragon label, textarea, optional character counter, and validation feedback.
 * - Enforce configurable character limits and surface caller-supplied validation rules.
 * - Maintain accessible relationships between label, control, and feedback.
 *
 * Must be rendered inside a component that provides a RHF Control (from useForm or useFormContext).
 */
const AutoExpandingTextareaField = <
  TFieldValues extends FieldValues,
  TName extends Path<TFieldValues>,
>({
    name,
    control,
    rules,
    controlId,
    label,
    labelClassName,
    placeholder,
    maxCharacters,
    disabled = false,
    className,
    fieldTestId,
    feedbackTestId,
  }: AutoExpandingTextareaFieldProps<TFieldValues, TName>) => {
  const intl = useIntl();
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const characterLimitMessage = maxCharacters !== undefined
    ? intl.formatMessage(messages.characterLimitExceeded, { max: maxCharacters })
    : undefined;

  const existingValidate = typeof rules?.validate === 'object' ? rules.validate : undefined;
  const mergedRules: RegisterOptions<TFieldValues, TName> = {
    ...rules,
    validate: {
      ...existingValidate,
      ...(maxCharacters !== undefined && {
        maxCharacters: (value) => String(value ?? '').length <= maxCharacters || characterLimitMessage!,
      }),
    },
  };

  const { field, fieldState } = useController({ name, control, rules: mergedRules });

  const currentLength = String(field.value ?? '').length;
  const isOverCharacterLimit = maxCharacters !== undefined && currentLength > maxCharacters;
  const rhfErrorMessage = typeof fieldState.error?.message === 'string'
    ? fieldState.error.message
    : undefined;
  const displayedErrorMessage = isOverCharacterLimit ? characterLimitMessage : rhfErrorMessage;
  const isInvalid = Boolean(displayedErrorMessage);

  const feedbackId = `${controlId}-feedback`;
  const counterId = `${controlId}-counter`;

  /**
   * Adjusts the textarea height to match its content.
   *
   * Resetting height to 'auto' first allows the field to shrink when text is deleted.
   * Setting it to scrollHeight then expands the field to the full content height and
   * avoids an internal scrollbar.
   *
   * Paragon's autoResize prop was not used here because it can conflict with RHF's
   * ref and onChange composition (ref errors or internal scrollbar instead of growing).
   */
  const resizeTextarea = useCallback((): void => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, []);

  // Re-size whenever the controlled value changes (covers pre-filled content and external resets).
  useEffect(() => {
    resizeTextarea();
  }, [field.value, resizeTextarea]);

  const showFeedback = Boolean(displayedErrorMessage);
  const showCounter = maxCharacters !== undefined;

  return (
    <Form.Group controlId={controlId} isInvalid={isInvalid} className={className}>
      <Form.Label>
        {labelClassName ? <span className={labelClassName}>{label}</span> : label}
      </Form.Label>

      <Form.Control
        as="textarea"
        rows={1}
        data-testid={fieldTestId}
        placeholder={placeholder}
        disabled={disabled}
        isInvalid={isInvalid}
        aria-invalid={isInvalid}
        aria-describedby={`${feedbackId} ${counterId}`}
        controlClassName="pathways-textarea__control"
        {...field}
        ref={(element: HTMLTextAreaElement | null) => {
          field.ref(element);
          textareaRef.current = element;
          if (element) {
            resizeTextarea();
          }
        }}
        onChange={(event) => {
          field.onChange(event);
          resizeTextarea();
        }}
      />

      {(showFeedback || showCounter) && (
        <div
          className={classNames('d-flex mt-1', {
            'justify-content-between align-items-center': showFeedback,
            'justify-content-end': !showFeedback,
          })}
        >
          {showFeedback && (
            <Form.Control.Feedback
              id={feedbackId}
              type="invalid"
              className="mb-0"
              data-testid={feedbackTestId}
            >
              {displayedErrorMessage}
            </Form.Control.Feedback>
          )}
          {showCounter && (
            <span
              id={counterId}
              className={classNames('small flex-shrink-0', {
                'ml-3': showFeedback,
                'text-danger': isInvalid,
                'text-muted': !isInvalid,
              })}
              data-testid={fieldTestId ? `${fieldTestId}-counter` : undefined}
            >
              {currentLength}/{maxCharacters}
            </span>
          )}
        </div>
      )}
    </Form.Group>
  );
};

export default AutoExpandingTextareaField;
