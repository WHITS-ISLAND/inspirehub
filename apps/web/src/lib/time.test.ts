import { describe, expect, test, vi } from "vitest";
import { timeAgo } from "./time";

describe("timeAgo", () => {
  test("returns 'たった今' for timestamps less than 1 minute ago", () => {
    const now = new Date().toISOString();
    expect(timeAgo(now)).toBe("たった今");
  });

  test("returns minutes suffix for timestamps 1-59 minutes ago", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T12:30:00Z"));
    expect(timeAgo("2025-01-01T12:25:00Z")).toBe("5分前");
    expect(timeAgo("2025-01-01T11:31:00Z")).toBe("59分前");
    vi.useRealTimers();
  });

  test("returns hours suffix for timestamps 1-23 hours ago", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T12:00:00Z"));
    expect(timeAgo("2025-01-01T11:00:00Z")).toBe("1時間前");
    expect(timeAgo("2024-12-31T13:00:00Z")).toBe("23時間前");
    vi.useRealTimers();
  });

  test("returns days suffix for timestamps 1-29 days ago", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-30T00:00:00Z"));
    expect(timeAgo("2025-01-29T00:00:00Z")).toBe("1日前");
    expect(timeAgo("2025-01-01T00:00:00Z")).toBe("29日前");
    vi.useRealTimers();
  });

  test("returns localized date string for timestamps 30 or more days ago", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-02-01T00:00:00Z"));
    const result = timeAgo("2025-01-01T00:00:00Z");
    expect(result).toBe(new Date("2025-01-01T00:00:00Z").toLocaleDateString());
    vi.useRealTimers();
  });

  test("boundary: exactly 0 seconds returns 'たった今'", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T12:00:00Z"));
    expect(timeAgo("2025-01-01T12:00:00Z")).toBe("たった今");
    vi.useRealTimers();
  });

  test("boundary: exactly 60 seconds returns '1分前'", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T12:01:00Z"));
    expect(timeAgo("2025-01-01T12:00:00Z")).toBe("1分前");
    vi.useRealTimers();
  });

  test("boundary: exactly 60 minutes returns '1時間前'", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T13:00:00Z"));
    expect(timeAgo("2025-01-01T12:00:00Z")).toBe("1時間前");
    vi.useRealTimers();
  });

  test("boundary: exactly 24 hours returns '1日前'", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-02T12:00:00Z"));
    expect(timeAgo("2025-01-01T12:00:00Z")).toBe("1日前");
    vi.useRealTimers();
  });
});
