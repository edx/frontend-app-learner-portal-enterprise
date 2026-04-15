import { renderHook, act } from '@testing-library/react';
import { useIntakeForm } from '../useIntakeForm';
import { INTAKE_STEPS, INTAKE_PAGES } from '../../constants';

describe('useIntakeForm', () => {
  const mockOnSubmit = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('initializes with default values', () => {
    const { result } = renderHook(() => useIntakeForm({ onSubmit: mockOnSubmit }));

    expect(result.current.pageIndex).toBe(0);
    expect(result.current.formData.learningPrefRes).toBe('async');
    expect(result.current.progress).toBe(0);
    expect(result.current.currentPage).toBe(INTAKE_PAGES[0]);
  });

  it('updates form data on change', () => {
    const { result } = renderHook(() => useIntakeForm({ onSubmit: mockOnSubmit }));

    act(() => {
      result.current.handleChange('careerGoalRes', 'Data Scientist');
    });

    expect(result.current.formData.careerGoalRes).toBe('Data Scientist');
  });

  it('navigates next correctly', () => {
    const { result } = renderHook(() => useIntakeForm({ onSubmit: mockOnSubmit }));

    act(() => {
      result.current.handleNext();
    });

    expect(result.current.pageIndex).toBe(1);
    expect(result.current.progress).toBeGreaterThan(0);
  });

  it('navigates back correctly', () => {
    const { result } = renderHook(() => useIntakeForm({ onSubmit: mockOnSubmit }));

    act(() => {
      result.current.setPageIndex(1);
    });
    expect(result.current.pageIndex).toBe(1);

    act(() => {
      result.current.handleBack();
    });

    expect(result.current.pageIndex).toBe(0);
  });

  it('does not navigate back if on first page', () => {
    const { result } = renderHook(() => useIntakeForm({ onSubmit: mockOnSubmit }));

    act(() => {
      result.current.handleBack();
    });

    expect(result.current.pageIndex).toBe(0);
  });

  it('submits and moves to processing on last step', async () => {
    const { result } = renderHook(() => useIntakeForm({ onSubmit: mockOnSubmit }));

    act(() => {
      result.current.setPageIndex(INTAKE_STEPS.PREFERENCES);
    });

    await act(async () => {
      await result.current.handleNext();
    });

    expect(result.current.pageIndex).toBe(INTAKE_STEPS.PROCESSING);
    expect(mockOnSubmit).toHaveBeenCalledWith(result.current.formData);
  });
});
