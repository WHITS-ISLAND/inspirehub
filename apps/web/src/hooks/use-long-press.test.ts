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
  test("デフォルト500ms経過後にonLongPressコールバックを発火する", async () => {
    const onLongPress = vi.fn();
    const { result } = renderHook(() => useLongPress({ onLongPress }));

    act(() => result.current.onTouchStart());
    expect(onLongPress).not.toHaveBeenCalled();
    await act(() => vi.advanceTimersByTime(500));
    expect(onLongPress).toHaveBeenCalledOnce();
  });

  test("カスタム閾値の経過後にonLongPressコールバックを発火する", async () => {
    const onLongPress = vi.fn();
    const { result } = renderHook(() => useLongPress({ onLongPress, threshold: 200 }));

    act(() => result.current.onTouchStart());
    await act(() => vi.advanceTimersByTime(199));
    expect(onLongPress).not.toHaveBeenCalled();
    await act(() => vi.advanceTimersByTime(1));
    expect(onLongPress).toHaveBeenCalledOnce();
  });

  test("閾値到達前にtouchMoveするとロングプレスをキャンセルする", async () => {
    const onLongPress = vi.fn();
    const { result } = renderHook(() => useLongPress({ onLongPress }));

    act(() => result.current.onTouchStart());
    act(() => result.current.onTouchMove());
    await act(() => vi.advanceTimersByTime(500));
    expect(onLongPress).not.toHaveBeenCalled();
  });

  test("閾値到達前にtouchEndするとロングプレスをキャンセルする", async () => {
    const onLongPress = vi.fn();
    const { result } = renderHook(() => useLongPress({ onLongPress }));

    act(() => result.current.onTouchStart());
    act(() => result.current.onTouchEnd());
    await act(() => vi.advanceTimersByTime(500));
    expect(onLongPress).not.toHaveBeenCalled();
  });

  test("ロングプレス発火後のclickイベントを抑制する", async () => {
    const onLongPress = vi.fn();
    const { result } = renderHook(() => useLongPress({ onLongPress }));

    act(() => result.current.onTouchStart());
    await act(() => vi.advanceTimersByTime(500));

    const event = { preventDefault: vi.fn(), stopPropagation: vi.fn() } as any;
    act(() => result.current.onClick(event));
    expect(event.preventDefault).toHaveBeenCalled();
    expect(event.stopPropagation).toHaveBeenCalled();
  });

  test("ロングプレス未発火時はclickイベントを抑制しない", () => {
    const onLongPress = vi.fn();
    const { result } = renderHook(() => useLongPress({ onLongPress }));

    act(() => result.current.onTouchStart());
    act(() => result.current.onTouchEnd());

    const event = { preventDefault: vi.fn(), stopPropagation: vi.fn() } as any;
    act(() => result.current.onClick(event));
    expect(event.preventDefault).not.toHaveBeenCalled();
  });

  test("ロングプレス後の新しいtouchStartで発火状態をリセットする", async () => {
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
