import '@testing-library/jest-dom/extend-expect';
import React from 'react';
import { Form } from '@openedx/paragon';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormProvider, useForm } from 'react-hook-form';
import IntakeTextareaQuestionField from '../IntakeTextareaQuestionField';
import type { IntakeFormValues } from '../IntakeQuestionsContainer';

interface MockFieldFormProps {
  onSubmit: (values: IntakeFormValues) => void;
}

const MockFieldForm = ({ onSubmit }: MockFieldFormProps) => {
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
    <FormProvider {...methods}>
      <Form onSubmit={methods.handleSubmit(onSubmit)}>
        <IntakeTextareaQuestionField
          name="motivation"
          controlId="motivation-field"
          label="Motivation label"
          placeholder="Motivation placeholder"
          requiredErrorMessage="Please enter your motivation."
          fieldTestId="intake-motivation-field"
          feedbackTestId="intake-motivation-feedback"
        />
        <button type="submit">Submit</button>
      </Form>
    </FormProvider>
  );
};

describe('IntakeTextareaQuestionField', () => {
  it('renders a textarea discoverable by label and placeholder', () => {
    render(<MockFieldForm onSubmit={jest.fn()} />);

    expect(screen.getByLabelText('Motivation label')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Motivation placeholder')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Motivation label' })).toBeInTheDocument();
  });

  it('registers with RHF and reflects typed input', async () => {
    const user = userEvent.setup();
    render(<MockFieldForm onSubmit={jest.fn()} />);

    const textarea = screen.getByLabelText('Motivation label');
    await user.type(textarea, 'New learning motivation');

    expect(textarea).toHaveValue('New learning motivation');
  });

  it('renders validation feedback and blocks submit for whitespace-only input', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();
    render(<MockFieldForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText('Motivation label'), '   ');
    await user.click(screen.getByRole('button', { name: 'Submit' }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByTestId('intake-motivation-feedback')).toHaveTextContent('Please enter your motivation.');
    expect(screen.getByTestId('intake-motivation-field')).toHaveAttribute('aria-invalid', 'true');
  });

  it('submits successfully with valid input', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();
    render(<MockFieldForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText('Motivation label'), 'I want to grow my data skills.');
    await user.click(screen.getByRole('button', { name: 'Submit' }));

    expect(screen.queryByTestId('intake-motivation-feedback')).not.toBeInTheDocument();
    expect(onSubmit).toHaveBeenCalledWith({
      motivation: 'I want to grow my data skills.',
      goal: '',
      background: '',
      industry: '',
    }, expect.anything());
  });
});
