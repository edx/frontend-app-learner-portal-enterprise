import { act, renderHook } from '@testing-library/react';
import { getAuthenticatedUser } from '@edx/frontend-platform/auth';

import useOneTimeFeedbackPrompt from '../useOneTimeFeedbackPrompt';
import { PATHWAY_FEEDBACK_PROMPT_SEEN_LOCALSTORAGE_KEY } from '../constants';

jest.mock('@edx/frontend-platform/auth');

const mockGetAuthenticatedUser = getAuthenticatedUser as jest.Mock;
const USERNAME = 'test-learner';

describe('useOneTimeFeedbackPrompt', () => {
  beforeEach(() => {
    mockGetAuthenticatedUser.mockReturnValue({ username: USERNAME });
    global.localStorage.clear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('does not open before 15 seconds', () => {
    jest.useFakeTimers();
    const { result } = renderHook(() => useOneTimeFeedbackPrompt({ hasGeneratedCourses: true }));

    act(() => { jest.advanceTimersByTime(14999); });

    expect(result.current.isOpen).toBe(false);
  });

  it('opens at 15 seconds after a real generated pathway becomes active, without marking the prompt as seen yet', () => {
    jest.useFakeTimers();
    const { result } = renderHook(() => useOneTimeFeedbackPrompt({ hasGeneratedCourses: true }));

    act(() => { jest.advanceTimersByTime(15000); });

    expect(result.current.isOpen).toBe(true);
    // Merely firing/opening must not mark it seen — only actual interaction (dismiss) does.
    expect(global.localStorage.getItem(PATHWAY_FEEDBACK_PROMPT_SEEN_LOCALSTORAGE_KEY(USERNAME))).toBeNull();
  });

  it('marks the prompt as seen only once dismiss() is called, not when the timer fires', () => {
    jest.useFakeTimers();
    const { result } = renderHook(() => useOneTimeFeedbackPrompt({ hasGeneratedCourses: true }));

    act(() => { jest.advanceTimersByTime(15000); });
    expect(global.localStorage.getItem(PATHWAY_FEEDBACK_PROMPT_SEEN_LOCALSTORAGE_KEY(USERNAME))).toBeNull();

    act(() => { result.current.dismiss(); });

    expect(result.current.isOpen).toBe(false);
    expect(global.localStorage.getItem(PATHWAY_FEEDBACK_PROMPT_SEEN_LOCALSTORAGE_KEY(USERNAME))).toBe('true');
  });

  it('does not schedule or open when there are no real generated courses (fixture-only case)', () => {
    jest.useFakeTimers();
    const { result } = renderHook(() => useOneTimeFeedbackPrompt({ hasGeneratedCourses: false }));

    act(() => { jest.advanceTimersByTime(20000); });

    expect(result.current.isOpen).toBe(false);
  });

  it('does not reset or duplicate the timer on irrelevant rerenders', () => {
    jest.useFakeTimers();
    const { result, rerender } = renderHook(
      (props) => useOneTimeFeedbackPrompt(props),
      { initialProps: { hasGeneratedCourses: true } },
    );

    act(() => { jest.advanceTimersByTime(10000); });
    // Rerender with an equivalent (new-reference but equal) props object — should not reset the effect's timer.
    rerender({ hasGeneratedCourses: true });
    act(() => { jest.advanceTimersByTime(5000); });

    expect(result.current.isOpen).toBe(true);
  });

  it('clears the pending timer on unmount, preventing a later open', () => {
    jest.useFakeTimers();
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
    const { result, unmount } = renderHook(() => useOneTimeFeedbackPrompt({ hasGeneratedCourses: true }));

    act(() => { jest.advanceTimersByTime(5000); });
    unmount();
    act(() => { jest.advanceTimersByTime(15000); });

    expect(clearTimeoutSpy).toHaveBeenCalled();
    expect(result.current.isOpen).toBe(false);
    clearTimeoutSpy.mockRestore();
  });

  it('clears the pending timer when the pathway page stops qualifying (navigating away/no longer generated)', () => {
    jest.useFakeTimers();
    const { result, rerender } = renderHook(
      (props) => useOneTimeFeedbackPrompt(props),
      { initialProps: { hasGeneratedCourses: true } },
    );

    act(() => { jest.advanceTimersByTime(5000); });
    rerender({ hasGeneratedCourses: false });
    act(() => { jest.advanceTimersByTime(15000); });

    expect(result.current.isOpen).toBe(false);
  });

  it('dismissing the automatically opened modal does not schedule another automatic open', () => {
    jest.useFakeTimers();
    const { result } = renderHook(() => useOneTimeFeedbackPrompt({ hasGeneratedCourses: true }));

    act(() => { jest.advanceTimersByTime(15000); });
    expect(result.current.isOpen).toBe(true);

    act(() => { result.current.dismiss(); });
    act(() => { jest.advanceTimersByTime(60000); });

    expect(result.current.isOpen).toBe(false);
  });

  it('does not reopen on remount after the learner has dismissed it (one-time marker recorded)', () => {
    jest.useFakeTimers();
    const first = renderHook(() => useOneTimeFeedbackPrompt({ hasGeneratedCourses: true }));
    act(() => { jest.advanceTimersByTime(15000); });
    expect(first.result.current.isOpen).toBe(true);
    act(() => { first.result.current.dismiss(); });
    first.unmount();

    const second = renderHook(() => useOneTimeFeedbackPrompt({ hasGeneratedCourses: true }));
    act(() => { jest.advanceTimersByTime(20000); });

    expect(second.result.current.isOpen).toBe(false);
  });

  it('can still open again on a later visit if the learner never dismissed it (e.g. closed the tab mid-session)', () => {
    jest.useFakeTimers();
    const first = renderHook(() => useOneTimeFeedbackPrompt({ hasGeneratedCourses: true }));
    act(() => { jest.advanceTimersByTime(15000); });
    expect(first.result.current.isOpen).toBe(true);
    // Session ends without ever calling dismiss() — marker was never set.
    first.unmount();

    const second = renderHook(() => useOneTimeFeedbackPrompt({ hasGeneratedCourses: true }));
    act(() => { jest.advanceTimersByTime(15000); });

    expect(second.result.current.isOpen).toBe(true);
  });

  it('never auto-prompts when there is no authenticated username to scope storage by', () => {
    mockGetAuthenticatedUser.mockReturnValue(null);
    jest.useFakeTimers();
    const { result } = renderHook(() => useOneTimeFeedbackPrompt({ hasGeneratedCourses: true }));

    act(() => { jest.advanceTimersByTime(20000); });

    expect(result.current.isOpen).toBe(false);
  });
});
