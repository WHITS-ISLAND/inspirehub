import { test, expect, describe } from "bun:test";
import { generateTokens, verifyAccessToken, extractUserFromToken } from "./auth";

describe("Auth Library", () => {
  test("should generate valid JWT tokens", async () => {
    const mockUser = {
      id: "user-123",
      email: "test@example.com",
      name: "Test User",
      avatar_url: "https://example.com/avatar.jpg",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const secret = "test-secret-key-that-is-long-enough-for-hs256-algorithm";
    const result = await generateTokens(mockUser, secret, secret);

    expect(result.accessToken).toBeDefined();
    expect(result.refreshToken).toBeDefined();
    expect(typeof result.accessToken).toBe("string");
    expect(typeof result.refreshToken).toBe("string");
  });

  test("should verify valid access token", async () => {
    const mockUser = {
      id: "user-123",
      email: "test@example.com",
      name: "Test User",
      avatar_url: "https://example.com/avatar.jpg",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const secret = "test-secret-key-that-is-long-enough-for-hs256-algorithm";
    const { accessToken } = await generateTokens(mockUser, secret, secret);

    const result = await verifyAccessToken(accessToken, secret);
    expect(result).toBeTruthy();
    expect(result?.id).toBe(mockUser.id);
    expect(result?.email).toBe(mockUser.email);
  });

  test("should reject invalid access token", async () => {
    const secret = "test-secret-key-that-is-long-enough-for-hs256-algorithm";
    const invalidToken = "invalid.token.here";

    const result = await verifyAccessToken(invalidToken, secret);
    expect(result).toBeNull();
  });

  test("should extract user from authorization header", () => {
    const mockUser = { id: "123", email: "test@example.com" };
    const result = extractUserFromToken(mockUser);

    expect(result.id).toBe("123");
    expect(result.email).toBe("test@example.com");
  });
});