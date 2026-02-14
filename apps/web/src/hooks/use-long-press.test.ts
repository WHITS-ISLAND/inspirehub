import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useLongPress } from "./use-long-press";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useLongPress", () => {
  test("fires onLongPress callback after default 500ms threshold", async () => {
    const onLongPress = vi.fn();
    const { result } = renderHook(() => useLongPress({ onLongPress }));

    act(() => result.current.onTouchStart());
    expect(onLongPress).not.toHaveBeenCalled();
    await act(() => vi.advanceTimersByTime(500));
    expect(onLongPress).toHaveBeenCalledOnce();
  });

  test("fires onLongPress callback after custom threshold", async () => {
    const onLongPress = vi.fn();
    const { result } = renderHook(() => useLongPress({ onLongPress, threshold: 200 }));

    act(() => result.current.onTouchStart());
    await act(() => vi.advanceTimersByTime(199));
    expect(onLongPress).not.toHaveBeenCalled();
    await act(() => vi.advanceTimersByTime(1));
    expect(onLongPress).toHaveBeenCalledOnce();
  });

  test("cancels long press when touch moves before threshold", async () => {
    const onLongPress = vi.fn();
    const { result } = renderHook(() => useLongPress({ onLongPress }));

    act(() => result.current.onTouchStart());
    act(() => result.current.onTouchMove());
    await act(() => vi.advanceTimersByTime(500));
    expect(onLongPress).not.toHaveBeenCalled();
  });

  test("cancels long press when touch ends before threshold", async () => {
    const onLongPress = vi.fn();
    const { result } = renderHook(() => useLongPress({ onLongPress }));

    act(() => result.current.onTouchStart());
    act(() => result.current.onTouchEnd());
    await act(() => vi.advanceTimersByTime(500));
    expect(onLongPress).not.toHaveBeenCalled();
  });

  test("suppresses click event after long press fires", async () => {
    const onLongPress = vi.fn();
    const { result } = renderHook(() => useLongPress({ onLongPress }));

    act(() => result.current.onTouchStart());
    await act(() => vi.advanceTimersByTime(500));

    const event = { preventDefault: vi.fn(), stopPropagation: vi.fn() } as any;
    act(() => result.current.onClick(event));
    expect(event.preventDefault).toHaveBeenCalled();
    expect(event.stopPropagation).toHaveBeenCalled();
  });

  test("does not suppress click event when long press did not fire", () => {
    const onLongPress = vi.fn();
    const { result } = renderHook(() => useLongPress({ onLongPress }));

    act(() => result.current.onTouchStart());
    act(() => result.current.onTouchEnd());

    const event = { preventDefault: vi.fn(), stopPropagation: vi.fn() } as any;
    act(() => result.current.onClick(event));
    expect(event.preventDefault).not.toHaveBeenCalled();
  });

  test("resets fired state on new touch start after previous long press", async () => {
    const onLongPress = vi.fn();
    const { result } = renderHook(() => useLongPress({ onLongPress }));

    act(() => result.current.onTouchStart());
    await act(() => vi.advanceTimersByTime(500));
    expect(onLongPress).toHaveBeenCalledOnce();

    act(() => result.current.onTouchStart());
    act(() => result.current.onTouchEnd());

    const event = { preventDefault: vi.fn(), stopPropagation: vi.fn() } as any;
    act(() => result.current.onClick(event));
    expect(event.preventDefault).not.toHaveBeenCalled();
  });
});
