import React from 'react';
import { useFormContext } from 'react-hook-form';
import type { Path } from 'react-hook-form';
import { AutoExpandingTextareaField } from '../shared';
import type { IntakeFormValues } from './IntakeQuestionsContainer';
import { DEFAULT_MAX_CHARACTERS_PER_INTAKE_QUESTION } from './constants';

/**
 * Configuration for a reusable intake textarea field.
 *
 * @property name - React Hook Form field name within {@link IntakeFormValues}.
 * @property controlId - Unique Paragon Form.Group control identifier.
 * @property label - Localized question label displayed above the textarea.
 * @property placeholder - Localized placeholder text displayed when the field is empty.
 * @property requiredErrorMessage - Localized validation message for empty / whitespace-only values.
 * @property maxCharacters - Optional field-level character limit, capped at
 *   {@link DEFAULT_MAX_CHARACTERS_PER_INTAKE_QUESTION}.
 * @property fieldTestId - Stable test identifier applied to the textarea control.
 * @property feedbackTestId - Stable test identifier applied to the validation feedback element.
 */
interface IntakeTextareaQuestionFieldProps {
  name: Path<IntakeFormValues>;
  controlId: string;
  label: string;
  placeholder: string;
  requiredErrorMessage: string;
  maxCharacters?: number;
  fieldTestId: string;
  feedbackTestId: string;
}

/**
 * Thin wrapper around {@link AutoExpandingTextareaField} for use inside intake forms.
 *
 * Extracts control from the nearest RHF FormProvider created by IntakeQuestionsContainer,
 * applies the hard character cap, and injects the required-field validation rule.
 *
 * Must be rendered inside a React Hook Form provider created by IntakeQuestionsContainer.
 */
const IntakeTextareaQuestionField = ({
  name,
  controlId,
  label,
  placeholder,
  requiredErrorMessage,
  maxCharacters: fieldMaxCharacters,
  fieldTestId,
  feedbackTestId,
}: IntakeTextareaQuestionFieldProps) => {
  const { control } = useFormContext<IntakeFormValues>();

  const maxCharacters = Math.min(
    fieldMaxCharacters ?? DEFAULT_MAX_CHARACTERS_PER_INTAKE_QUESTION,
    DEFAULT_MAX_CHARACTERS_PER_INTAKE_QUESTION,
  );

  const rules = {
    validate: {
      required: (value: string) => value.trim().length > 0 || requiredErrorMessage,
    },
  };

  return (
    <AutoExpandingTextareaField
      name={name}
      control={control}
      rules={rules}
      controlId={controlId}
      label={label}
      placeholder={placeholder}
      maxCharacters={maxCharacters}
      className="mb-4"
      fieldTestId={fieldTestId}
      feedbackTestId={feedbackTestId}
    />
  );
};

export default IntakeTextareaQuestionField;
