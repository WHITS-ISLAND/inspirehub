import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDebounce } from "./use-debounce";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useDebounce", () => {
  test("指定ミリ秒経過後にデバウンスされた値を返す", async () => {
    const { result } = renderHook(() => useDebounce("hello", 300));

    expect(result.current).toBe("hello");

    await act(() => vi.advanceTimersByTime(300));

    expect(result.current).toBe("hello");
  });

  test("遅延時間内の再変更で前の値をキャンセルし最新値のみ反映する", async () => {
    const { result, rerender } = renderHook(({ value, delay }) => useDebounce(value, delay), {
      initialProps: { value: "first", delay: 300 },
    });

    expect(result.current).toBe("first");

    await act(() => vi.advanceTimersByTime(300));

    rerender({ value: "second", delay: 300 });
    expect(result.current).toBe("first");

    await act(() => vi.advanceTimersByTime(100));
    rerender({ value: "third", delay: 300 });

    await act(() => vi.advanceTimersByTime(299));
    expect(result.current).toBe("first");

    await act(() => vi.advanceTimersByTime(1));
    expect(result.current).toBe("third");
  });

  test("アンマウント時にタイマーをクリーンアップする", async () => {
    const { result, unmount, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: "initial", delay: 300 } },
    );

    await act(() => vi.advanceTimersByTime(300));

    rerender({ value: "updated", delay: 300 });
    unmount();

    await act(() => vi.advanceTimersByTime(300));
    expect(result.current).toBe("initial");
  });
});
