import '@testing-library/jest-dom/extend-expect';
import React from 'react';
import { Form } from '@openedx/paragon';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntlProvider } from '@edx/frontend-platform/i18n';
import { FormProvider, useForm } from 'react-hook-form';
import IntakeTextareaQuestionField from '../IntakeTextareaQuestionField';
import { DEFAULT_MAX_CHARACTERS_PER_INTAKE_QUESTION } from '../constants';
import type { IntakeFormValues } from '../IntakeQuestionsContainer';

interface MockFieldFormProps {
  onSubmit: (values: IntakeFormValues) => void;
  maxCharacters?: number;
}

const MockFieldForm = ({ onSubmit, maxCharacters }: MockFieldFormProps) => {
  const methods = useForm<IntakeFormValues>({
    defaultValues: {
      motivation: '',
      goal: '',
      background: '',
      industry: '',
    },
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    shouldFocusError: true,
  });

  return (
    <IntlProvider locale="en">
      <FormProvider {...methods}>
        <Form onSubmit={methods.handleSubmit(onSubmit)}>
          <IntakeTextareaQuestionField
            name="motivation"
            controlId="motivation-field"
            label="Motivation label"
            placeholder="Motivation placeholder"
            requiredErrorMessage="Please enter your motivation."
            maxCharacters={maxCharacters}
            fieldTestId="intake-motivation-field"
            feedbackTestId="intake-motivation-feedback"
          />
          <button type="submit">Submit</button>
        </Form>
      </FormProvider>
    </IntlProvider>
  );
};

describe('IntakeTextareaQuestionField', () => {
  it('renders a textarea discoverable by label and placeholder with default counter', () => {
    render(<MockFieldForm onSubmit={jest.fn()} />);

    expect(screen.getByLabelText('Motivation label')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Motivation placeholder')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Motivation label' })).toBeInTheDocument();
    expect(screen.getByTestId('intake-motivation-field-counter')).toHaveTextContent(`0/${DEFAULT_MAX_CHARACTERS_PER_INTAKE_QUESTION}`);
    expect(screen.getByLabelText('Motivation label')).not.toHaveAttribute('maxLength');
  });

  it('registers with RHF, reflects typed input, and updates the counter', async () => {
    const user = userEvent.setup();
    render(<MockFieldForm onSubmit={jest.fn()} />);

    const textarea = screen.getByLabelText('Motivation label');
    await user.type(textarea, 'New learning motivation');

    expect(textarea).toHaveValue('New learning motivation');
    expect(screen.getByTestId('intake-motivation-field-counter')).toHaveTextContent('23/300');
  });

  it('renders required validation feedback and blocks submit for whitespace-only input', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();
    render(<MockFieldForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText('Motivation label'), '   ');
    await user.click(screen.getByRole('button', { name: 'Submit' }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByTestId('intake-motivation-feedback')).toHaveTextContent('Please enter your motivation.');
    expect(screen.getByTestId('intake-motivation-field')).toHaveAttribute('aria-invalid', 'true');
  });

  it('accepts 300 characters and submits successfully at the default limit', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();
    render(<MockFieldForm onSubmit={onSubmit} />);
    const valueAtDefaultLimit = 'a'.repeat(DEFAULT_MAX_CHARACTERS_PER_INTAKE_QUESTION);

    await user.type(screen.getByLabelText('Motivation label'), valueAtDefaultLimit);
    await user.click(screen.getByRole('button', { name: 'Submit' }));

    expect(screen.queryByTestId('intake-motivation-feedback')).not.toBeInTheDocument();
    expect(screen.getByTestId('intake-motivation-field-counter')).toHaveTextContent('300/300');
    expect(onSubmit).toHaveBeenCalledWith({
      motivation: valueAtDefaultLimit,
      goal: '',
      background: '',
      industry: '',
    }, expect.anything());
  });

  it('allows input above 300 characters without truncation but blocks submit', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();
    render(<MockFieldForm onSubmit={onSubmit} />);
    const valueAboveDefaultLimit = 'a'.repeat(DEFAULT_MAX_CHARACTERS_PER_INTAKE_QUESTION + 1);

    await user.type(screen.getByLabelText('Motivation label'), valueAboveDefaultLimit);
    await user.click(screen.getByRole('button', { name: 'Submit' }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Motivation label')).toHaveValue(valueAboveDefaultLimit);
    expect(screen.getByTestId('intake-motivation-field-counter')).toHaveTextContent('301/300');
    expect(screen.getByTestId('intake-motivation-feedback')).toHaveTextContent('Please keep your response up to 300 characters.');
  });

  it('respects a smaller field-specific limit', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();
    render(<MockFieldForm onSubmit={onSubmit} maxCharacters={200} />);
    const valueAboveSmallerLimit = 'a'.repeat(201);

    await user.type(screen.getByLabelText('Motivation label'), valueAboveSmallerLimit);
    await user.click(screen.getByRole('button', { name: 'Submit' }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByTestId('intake-motivation-field-counter')).toHaveTextContent('201/200');
    expect(screen.getByTestId('intake-motivation-feedback')).toHaveTextContent('Please keep your response up to 200 characters.');
  });

  it('caps larger field-specific limits at the 300-character hard cap', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();
    render(<MockFieldForm onSubmit={onSubmit} maxCharacters={500} />);
    const valueAboveHardCap = 'a'.repeat(DEFAULT_MAX_CHARACTERS_PER_INTAKE_QUESTION + 1);

    expect(screen.getByTestId('intake-motivation-field-counter')).toHaveTextContent('0/300');
    await user.type(screen.getByLabelText('Motivation label'), valueAboveHardCap);
    await user.click(screen.getByRole('button', { name: 'Submit' }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByTestId('intake-motivation-field-counter')).toHaveTextContent('301/300');
    expect(screen.getByTestId('intake-motivation-feedback')).toHaveTextContent(
      'Please keep your response up to 300 characters.',
    );
  });

  it('does not truncate pasted input above the effective limit', async () => {
    const user = userEvent.setup();
    render(<MockFieldForm onSubmit={jest.fn()} />);
    const pastedValue = 'b'.repeat(DEFAULT_MAX_CHARACTERS_PER_INTAKE_QUESTION + 5);
    const textarea = screen.getByLabelText('Motivation label');

    await user.click(textarea);
    await user.paste(pastedValue);

    expect(textarea).toHaveValue(pastedValue);
    expect(screen.getByTestId('intake-motivation-field-counter')).toHaveTextContent('305/300');
  });
});
