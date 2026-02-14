import { describe, expect, test, vi } from "vitest";
import { timeAgo } from "./time";

describe("timeAgo", () => {
  test("1分未満のタイムスタンプに対して「たった今」を返す", () => {
    const now = new Date().toISOString();
    expect(timeAgo(now)).toBe("たった今");
  });

  test("1〜59分前のタイムスタンプに対して「N分前」を返す", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T12:30:00Z"));
    expect(timeAgo("2025-01-01T12:25:00Z")).toBe("5分前");
    expect(timeAgo("2025-01-01T11:31:00Z")).toBe("59分前");
    vi.useRealTimers();
  });

  test("1〜23時間前のタイムスタンプに対して「N時間前」を返す", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T12:00:00Z"));
    expect(timeAgo("2025-01-01T11:00:00Z")).toBe("1時間前");
    expect(timeAgo("2024-12-31T13:00:00Z")).toBe("23時間前");
    vi.useRealTimers();
  });

  test("1〜29日前のタイムスタンプに対して「N日前」を返す", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-30T00:00:00Z"));
    expect(timeAgo("2025-01-29T00:00:00Z")).toBe("1日前");
    expect(timeAgo("2025-01-01T00:00:00Z")).toBe("29日前");
    vi.useRealTimers();
  });

  test("30日以上前のタイムスタンプに対してロケール日付文字列を返す", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-02-01T00:00:00Z"));
    const result = timeAgo("2025-01-01T00:00:00Z");
    expect(result).toBe(new Date("2025-01-01T00:00:00Z").toLocaleDateString());
    vi.useRealTimers();
  });

  test("差分0秒は「たった今」を返す", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T12:00:00Z"));
    expect(timeAgo("2025-01-01T12:00:00Z")).toBe("たった今");
    vi.useRealTimers();
  });

  test("差分ちょうど60秒は「1分前」を返す", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T12:01:00Z"));
    expect(timeAgo("2025-01-01T12:00:00Z")).toBe("1分前");
    vi.useRealTimers();
  });

  test("差分ちょうど60分は「1時間前」を返す", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T13:00:00Z"));
    expect(timeAgo("2025-01-01T12:00:00Z")).toBe("1時間前");
    vi.useRealTimers();
  });

  test("差分ちょうど24時間は「1日前」を返す", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-02T12:00:00Z"));
    expect(timeAgo("2025-01-01T12:00:00Z")).toBe("1日前");
    vi.useRealTimers();
  });
});
