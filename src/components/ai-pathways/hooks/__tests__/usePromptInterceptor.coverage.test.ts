import { renderHook, act } from '@testing-library/react';
import { usePromptInterceptor } from '../usePromptInterceptor';
import { validateBundle } from '../../services/promptValidation';

jest.mock('../../services/promptValidation');

describe('usePromptInterceptor coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('no-ops convenience methods when not pending', () => {
    const { result } = renderHook(() => usePromptInterceptor());

    // These should not crash or do anything
    act(() => {
      result.current.accept();
      result.current.reject();
      result.current.cancel();
    });

    expect(result.current.isPending).toBe(false);
  });

  it('includes validation warnings in the result', async () => {
    const mockWarnings = [{ message: 'warn' }];
    (validateBundle as jest.Mock).mockReturnValue({ issues: mockWarnings });

    const { result } = renderHook(() => usePromptInterceptor());
    const bundle = { combined: 'test' } as any;
    const context = { label: 'Test', messages: [] };

    let interceptResult: any;
    act(() => {
      result.current.interceptPrompt(bundle, context).then(r => { interceptResult = r; });
    });

    await act(async () => {
      result.current.accept();
    });

    expect(interceptResult.validationWarnings).toEqual(mockWarnings);
  });
});
