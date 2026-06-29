import '@testing-library/jest-dom/extend-expect';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntlProvider } from '@edx/frontend-platform/i18n';
import { Form } from '@openedx/paragon';
import { useForm, FormProvider } from 'react-hook-form';
import AutoExpandingTextareaField from './AutoExpandingTextareaField';

interface TestFormValues {
  content: string;
}

interface WrapperProps {
  defaultValue?: string;
  maxCharacters?: number;
  required?: boolean;
  disabled?: boolean;
  onSubmit?: (values: TestFormValues) => void;
}

const Wrapper = ({
  defaultValue = '',
  maxCharacters,
  required = false,
  disabled = false,
  onSubmit = jest.fn(),
}: WrapperProps) => {
  const methods = useForm<TestFormValues>({
    defaultValues: { content: defaultValue },
    mode: 'onChange',
  });

  const rules = required
    ? { validate: { required: (v: string) => v.trim().length > 0 || 'Required.' } }
    : undefined;

  return (
    <IntlProvider locale="en">
      <FormProvider {...methods}>
        <Form onSubmit={methods.handleSubmit(onSubmit)}>
          <AutoExpandingTextareaField
            name="content"
            control={methods.control}
            rules={rules}
            controlId="test-field"
            label="Test label"
            placeholder="Enter text"
            maxCharacters={maxCharacters}
            disabled={disabled}
            fieldTestId="test-textarea"
            feedbackTestId="test-feedback"
          />
          <button type="submit">Submit</button>
        </Form>
      </FormProvider>
    </IntlProvider>
  );
};

describe('AutoExpandingTextareaField', () => {
  it('renders label, textarea, and placeholder', () => {
    render(<Wrapper />);
    expect(screen.getByLabelText('Test label')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Test label' })).toBeInTheDocument();
  });

  it('shows no counter when maxCharacters is not provided', () => {
    render(<Wrapper />);
    expect(screen.queryByTestId('test-textarea-counter')).not.toBeInTheDocument();
  });

  it('shows a counter at 0/max when maxCharacters is provided', () => {
    render(<Wrapper maxCharacters={300} />);
    expect(screen.getByTestId('test-textarea-counter')).toHaveTextContent('0/300');
  });

  it('updates the counter as the user types', async () => {
    const user = userEvent.setup();
    render(<Wrapper maxCharacters={300} />);

    await user.type(screen.getByLabelText('Test label'), 'hello');

    expect(screen.getByTestId('test-textarea-counter')).toHaveTextContent('5/300');
  });

  it('shows the character limit error and marks the field invalid when over the limit', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();
    render(<Wrapper maxCharacters={5} onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText('Test label'), 'toolong');

    expect(screen.getByTestId('test-feedback')).toHaveTextContent('Please keep your response up to 5 characters.');
    expect(screen.getByTestId('test-textarea')).toHaveAttribute('aria-invalid', 'true');
  });

  it('blocks form submission when over the character limit', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();
    render(<Wrapper maxCharacters={5} onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText('Test label'), 'toolong');
    await user.click(screen.getByRole('button', { name: 'Submit' }));

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('allows submission when exactly at the character limit', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();
    render(<Wrapper maxCharacters={5} onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText('Test label'), 'hello');
    await user.click(screen.getByRole('button', { name: 'Submit' }));

    expect(onSubmit).toHaveBeenCalledWith({ content: 'hello' }, expect.anything());
    expect(screen.queryByTestId('test-feedback')).not.toBeInTheDocument();
  });

  it('shows a required validation error after submit when field is empty', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();
    render(<Wrapper required onSubmit={onSubmit} />);

    await user.click(screen.getByRole('button', { name: 'Submit' }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByTestId('test-feedback')).toHaveTextContent('Required.');
    expect(screen.getByTestId('test-textarea')).toHaveAttribute('aria-invalid', 'true');
  });

  it('disables the textarea when disabled is true', () => {
    render(<Wrapper disabled />);
    expect(screen.getByLabelText('Test label')).toBeDisabled();
  });

  it('renders a pre-filled value', () => {
    render(<Wrapper defaultValue="Pre-filled content" maxCharacters={300} />);
    expect(screen.getByLabelText('Test label')).toHaveValue('Pre-filled content');
    expect(screen.getByTestId('test-textarea-counter')).toHaveTextContent('18/300');
  });

  it('triggers resizeTextarea on mount via ref callback', () => {
    const heightSetter = jest.fn();
    // jsdom does not compute scrollHeight, but we verify the setter runs.
    Object.defineProperty(HTMLTextAreaElement.prototype, 'scrollHeight', {
      configurable: true,
      get: () => 50,
    });
    Object.defineProperty(HTMLTextAreaElement.prototype, 'style', {
      configurable: true,
      get() {
        return {
          set height(v: string) { heightSetter(v); },
        };
      },
    });

    render(<Wrapper defaultValue="Some content" />);

    // resizeTextarea sets height to 'auto' then to scrollHeight px
    expect(heightSetter).toHaveBeenCalledWith('auto');
    expect(heightSetter).toHaveBeenCalledWith('50px');
  });
});
