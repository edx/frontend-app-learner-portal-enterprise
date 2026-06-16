import React, { useCallback, useRef } from 'react';
import { Form } from '@openedx/paragon';
import { useFormContext } from 'react-hook-form';
import type { IntakeFormValues } from './IntakeQuestionsContainer';

/**
 * Configuration for a reusable intake textarea field.
 *
 * @property {keyof IntakeFormValues} name
 *   React Hook Form field name within {@link IntakeFormValues}.
 *
 * @property {string} controlId
 *   Unique Paragon Form.Group control identifier used for label association
 *   and accessibility attributes.
 *
 * @property {string} label
 *   Localized question label displayed above the textarea.
 *
 * @property {string} placeholder
 *   Localized placeholder text displayed when the field is empty.
 *
 * @property {string} requiredErrorMessage
 *   Localized validation message returned when the field is empty or contains
 *   only whitespace.
 *
 * @property {string} fieldTestId
 *   Stable test identifier applied to the textarea control.
 *
 * @property {string} feedbackTestId
 *   Stable test identifier applied to the validation feedback element.
 */
interface IntakeTextareaQuestionFieldProps {
  name: keyof IntakeFormValues;
  controlId: string;
  label: string;
  placeholder: string;
  requiredErrorMessage: string;
  fieldTestId: string;
  feedbackTestId: string;
}

/**
 * RHF-backed Paragon textarea used by learner pathway intake questions.
 *
 * This component must be rendered inside a React Hook Form provider created by
 * `IntakeQuestionsContainer`.
 *
 * Form field names are defined by {@link IntakeFormValues}. Runtime form state,
 * registration, and validation errors are sourced from
 * `useFormContext<IntakeFormValues>()`.
 *
 * Responsibilities:
 * - Register the textarea with React Hook Form.
 * - Render Paragon label, textarea, and validation feedback.
 * - Validate that learners enter non-whitespace content.
 * - Automatically expand and shrink vertically as content changes.
 * - Preserve accessibility relationships between label, control, and feedback.
 *
 * @param {IntakeTextareaQuestionFieldProps} props
 *   Field configuration and presentation metadata.
 *
 * @returns {React.ReactElement}
 *   A Paragon textarea field integrated with React Hook Form.
 */
const IntakeTextareaQuestionField: React.FC<IntakeTextareaQuestionFieldProps> = ({
  name,
  controlId,
  label,
  placeholder,
  requiredErrorMessage,
  fieldTestId,
  feedbackTestId,
}: IntakeTextareaQuestionFieldProps): React.ReactElement => {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const {
    register,
    formState: { errors },
  } = useFormContext<IntakeFormValues>();

  /**
   * Adjusts the textarea height to match its content.
   *
   * Paragon 22.17.0 exposes an `autoResize` prop, but it was not used here
   * because it can be brittle when combined with React Hook Form registration.
   * In this flow, RHF composes its own `ref` and `onChange` handlers, while
   * Paragon's autosize behavior also depends on its internal textarea ref and
   * change handler. That interaction caused either runtime ref errors or a
   * textarea that kept an internal scrollbar instead of growing.
   *
   * This local resize handler keeps Paragon responsible for the form UI and
   * validation styling, while this feature owns only the textarea height behavior.
   *
   * Resetting the height to `auto` first allows the field to shrink when text
   * is deleted. Setting it to `scrollHeight` then expands the field to the full
   * content height and avoids an internal scrollbar.
   *
   * @returns {void}
   */
  const resizeTextarea = useCallback((): void => {
    const textarea = textareaRef.current;

    if (!textarea) {
      return;
    }

    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, []);

  const fieldError = errors[name];
  const errorMessage = typeof fieldError?.message === 'string'
    ? fieldError.message
    : undefined;

  const feedbackId = `${controlId}-feedback`;
  const isInvalid = Boolean(errorMessage);

  /**
   * Field registration returned by React Hook Form for the configured
   * {@link IntakeFormValues} field.
   *
   * Keeping registration in a variable lets this component compose RHF's
   * `ref` and `onChange` with local textarea autosizing behavior.
   */
  const registration = register(name, {
    validate: (value) => (
      value.trim().length > 0 || requiredErrorMessage
    ),
  });

  return (
    <Form.Group
      controlId={controlId}
      isInvalid={isInvalid}
      className="mb-4"
    >
      <Form.Label>{label}</Form.Label>
      <Form.Control
        as="textarea"
        rows={1}
        data-testid={fieldTestId}
        placeholder={placeholder}
        isInvalid={isInvalid}
        aria-invalid={isInvalid}
        aria-describedby={isInvalid ? feedbackId : undefined}
        controlClassName="intake-textarea-question-field__control"
        {...registration}
        ref={(element: HTMLTextAreaElement | null) => {
          registration.ref(element);
          textareaRef.current = element;

          if (element) {
            resizeTextarea();
          }
        }}
        onChange={(event) => {
          registration.onChange(event);
          resizeTextarea();
        }}
      />
      {errorMessage && (
        <Form.Control.Feedback
          id={feedbackId}
          type="invalid"
          data-testid={feedbackTestId}
        >
          {errorMessage}
        </Form.Control.Feedback>
      )}
    </Form.Group>
  );
};

export default IntakeTextareaQuestionField;
