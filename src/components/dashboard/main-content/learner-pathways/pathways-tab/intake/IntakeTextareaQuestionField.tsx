import React, { useCallback, useRef } from 'react';
import classNames from 'classnames';
import { Form } from '@openedx/paragon';
import { useIntl } from '@edx/frontend-platform/i18n';
import { useFormContext } from 'react-hook-form';
import { DEFAULT_MAX_CHARACTERS_PER_INTAKE_QUESTION } from './constants';
import type { IntakeFormValues } from './IntakeQuestionsContainer';
import messages from './messages';

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
 * @property {number} [maxCharacters]
 *   Optional field-level character limit. The effective limit is capped by
 *   {@link DEFAULT_MAX_CHARACTERS_PER_INTAKE_QUESTION}, so individual fields can
 *   choose a smaller limit but cannot exceed the default intake hard cap.
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
  maxCharacters?: number;
  fieldTestId: string;
  feedbackTestId: string;
}

/**
 * Props for rendering a single field feedback row.
 *
 * @property {string} feedbackId
 *   Element id used by `aria-describedby` to associate the textarea with its
 *   validation feedback.
 *
 * @property {string} feedbackTestId
 *   Stable test identifier applied to the Paragon validation feedback element.
 *
 * @property {string} counterTestId
 *   Stable test identifier applied to the character counter.
 *
 * @property {string} [errorMessage]
 *   Current validation message. When present, Paragon invalid feedback is shown.
 *
 * @property {number} currentLength
 *   Current number of characters in the field value.
 *
 * @property {number} maxCharacters
 *   Effective character limit for this field.
 *
 * @property {boolean} isInvalid
 *   Whether the parent field is currently invalid. Used to keep the counter
 *   visually aligned with the field's validation state.
 */
interface IntakeFieldValidationFeedbackProps {
  feedbackId: string;
  feedbackTestId: string;
  counterTestId: string;
  errorMessage?: string;
  currentLength: number;
  maxCharacters: number;
  isInvalid: boolean;
}

/**
 * Renders validation feedback and character count for an intake textarea.
 *
 * This component intentionally keeps Paragon's `Form.Control.Feedback` for the
 * validation message so the field uses the expected Paragon invalid icon and
 * styling. The character counter is rendered alongside that feedback, rather
 * than inside the feedback node, because Paragon injects icon markup into
 * `Form.Control.Feedback`.
 *
 * @param {IntakeFieldValidationFeedbackProps} props
 *   Validation message and counter metadata.
 *
 * @returns {React.ReactElement}
 *   A single row containing optional Paragon validation feedback and the
 *   character counter.
 */
const IntakeFieldValidationFeedback: React.FC<IntakeFieldValidationFeedbackProps> = ({
  feedbackId,
  feedbackTestId,
  counterTestId,
  errorMessage,
  currentLength,
  maxCharacters,
  isInvalid,
}: IntakeFieldValidationFeedbackProps): React.ReactElement => {
  if (errorMessage) {
    return (
      <div className="d-flex justify-content-between align-items-center mt-1">
        <Form.Control.Feedback
          id={feedbackId}
          type="invalid"
          className="mb-0"
          data-testid={feedbackTestId}
        >
          {errorMessage}
        </Form.Control.Feedback>

        <span
          className="text-danger small ml-3 flex-shrink-0"
          data-testid={counterTestId}
        >
          {currentLength}
          /
          {maxCharacters}
        </span>
      </div>
    );
  }

  return (
    <div className="d-flex justify-content-end mt-1">
      <span
        className={classNames('small', {
          'text-danger': isInvalid,
          'text-muted': !isInvalid,
        })}
        data-testid={counterTestId}
      >
        {currentLength}
        /
        {maxCharacters}
      </span>
    </div>
  );
};

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
 * - Enforce configurable character limits.
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
  maxCharacters: fieldMaxCharacters,
  fieldTestId,
  feedbackTestId,
}: IntakeTextareaQuestionFieldProps): React.ReactElement => {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const intl = useIntl();

  const {
    register,
    watch,
    formState: { errors },
  } = useFormContext<IntakeFormValues>();

  const currentValue = watch(name) ?? '';
  const currentLength = currentValue.length;

  const maxCharacters = Math.min(
    fieldMaxCharacters ?? DEFAULT_MAX_CHARACTERS_PER_INTAKE_QUESTION,
    DEFAULT_MAX_CHARACTERS_PER_INTAKE_QUESTION,
  );

  const isOverCharacterLimit = currentLength > maxCharacters;

  const characterLimitMessage = intl.formatMessage(
    messages.characterLimitExceeded,
    { max: maxCharacters },
  );

  const fieldError = errors[name];
  const fieldErrorMessage = typeof fieldError?.message === 'string'
    ? fieldError.message
    : undefined;

  const displayedErrorMessage = isOverCharacterLimit
    ? characterLimitMessage
    : fieldErrorMessage;

  const isInvalid = Boolean(displayedErrorMessage);

  const feedbackId = `${controlId}-feedback`;
  const counterId = `${controlId}-counter`;

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

  /**
   * Field registration returned by React Hook Form for the configured
   * {@link IntakeFormValues} field.
   *
   * Keeping registration in a variable lets this component compose RHF's `ref`
   * and `onChange` with local textarea autosizing behavior.
   */
  const registration = register(name, {
    validate: {
      required: (value) => (
        value.trim().length > 0 || requiredErrorMessage
      ),
      maxCharacters: (value) => (
        value.length <= maxCharacters || characterLimitMessage
      ),
    },
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
        aria-describedby={`${feedbackId} ${counterId}`}
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

      <IntakeFieldValidationFeedback
        feedbackId={feedbackId}
        feedbackTestId={feedbackTestId}
        counterTestId={`${fieldTestId}-counter`}
        errorMessage={displayedErrorMessage}
        currentLength={currentLength}
        maxCharacters={maxCharacters}
        isInvalid={isInvalid}
      />
    </Form.Group>
  );
};

export default IntakeTextareaQuestionField;
