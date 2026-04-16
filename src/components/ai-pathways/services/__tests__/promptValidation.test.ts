import { validateBundle, PROMPT_SIZE_WARNING_THRESHOLD } from '../promptValidation';
import { XpertPromptBundle } from '../../types';

describe('promptValidation', () => {
  const mockBundle = (parts: any[], combined: string): XpertPromptBundle => <XpertPromptBundle>({
    parts,
    combined,
  });

  it('validates a correct bundle', () => {
    const bundle = mockBundle(
      [{ label: 'base', content: 'test content', required: true }],
      'test content',
    );
    const result = validateBundle(bundle);
    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('fails if a required part has no label', () => {
    const bundle = mockBundle(
      [{ label: '', content: 'test content', required: true }],
      'test content',
    );
    const result = validateBundle(bundle);
    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual(expect.objectContaining({
      code: 'MISSING_REQUIRED_PART_LABEL',
      severity: 'error',
    }));
  });

  it('fails if a required part is empty', () => {
    const bundle = mockBundle(
      [{ label: 'base', content: '  ', required: true }],
      '  ',
    );
    const result = validateBundle(bundle);
    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual(expect.objectContaining({
      code: 'EMPTY_REQUIRED_PART',
      severity: 'error',
    }));
  });

  it('fails if combined prompt is empty', () => {
    const bundle = mockBundle(
      [{ label: 'base', content: 'test', required: false }],
      '',
    );
    const result = validateBundle(bundle);
    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual(expect.objectContaining({
      code: 'EMPTY_COMBINED_PROMPT',
      severity: 'error',
    }));
  });

  it('warns if prompt exceeds size threshold', () => {
    const longContent = 'a'.repeat(PROMPT_SIZE_WARNING_THRESHOLD + 1);
    const bundle = mockBundle(
      [{ label: 'base', content: longContent, required: true }],
      longContent,
    );
    const result = validateBundle(bundle);
    expect(result.valid).toBe(true);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0].code).toBe('PROMPT_SIZE_EXCEEDS_THRESHOLD');
  });

  it('checks for required labels if provided', () => {
    const bundle = mockBundle(
      [{ label: 'base', content: 'test', required: false }],
      'test',
    );
    const result = validateBundle(bundle, ['schema']);
    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual(expect.objectContaining({
      code: 'MISSING_REQUIRED_LABEL',
      severity: 'error',
      message: 'Expected a prompt part with label "schema" but none was found in the bundle.',
    }));
  });

  it('passes if required labels are present', () => {
    const bundle = mockBundle(
      [
        { label: 'base', content: 'test', required: false },
        { label: 'schema', content: 'test', required: false },
      ],
      'test',
    );
    const result = validateBundle(bundle, ['schema']);
    expect(result.valid).toBe(true);
  });
});
