import { beforeEach, describe, expect, test } from "vitest";
import { useAuthStore } from "./auth";

describe("useAuthStore", () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
    localStorage.clear();
  });

  test("initializes with unauthenticated state", () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
  });

  test("setAuth sets user, token, and marks as authenticated", () => {
    const user = { id: "1", email: "a@b.com", name: "Test" };
    useAuthStore.getState().setAuth(user, "tok-123");
    const state = useAuthStore.getState();
    expect(state.user).toEqual(user);
    expect(state.accessToken).toBe("tok-123");
    expect(state.isAuthenticated).toBe(true);
  });

  test("setAuth clears any previous error", () => {
    useAuthStore.setState({ error: "old error" });
    useAuthStore.getState().setAuth({ id: "1", email: "a@b.com", name: "Test" }, "tok");
    expect(useAuthStore.getState().error).toBeNull();
  });

  test("setAccessToken updates only the access token", () => {
    useAuthStore.getState().setAuth({ id: "1", email: "a@b.com", name: "Test" }, "old");
    useAuthStore.getState().setAccessToken("new-tok");
    const state = useAuthStore.getState();
    expect(state.accessToken).toBe("new-tok");
    expect(state.user?.name).toBe("Test");
  });

  test("logout clears user, token, and authentication status", () => {
    useAuthStore.getState().setAuth({ id: "1", email: "a@b.com", name: "Test" }, "tok");
    useAuthStore.getState().logout();
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });

  test("logout clears any previous error", () => {
    useAuthStore.setState({ error: "some error" });
    useAuthStore.getState().logout();
    expect(useAuthStore.getState().error).toBeNull();
  });

  test("setLoading toggles loading state", () => {
    useAuthStore.getState().setLoading(true);
    expect(useAuthStore.getState().isLoading).toBe(true);
    useAuthStore.getState().setLoading(false);
    expect(useAuthStore.getState().isLoading).toBe(false);
  });

  test("setError stores error message", () => {
    useAuthStore.getState().setError("fail");
    expect(useAuthStore.getState().error).toBe("fail");
  });

  test("setError clears error message", () => {
    useAuthStore.setState({ error: "existing" });
    useAuthStore.getState().setError(null);
    expect(useAuthStore.getState().error).toBeNull();
  });

  test("persists only user and isAuthenticated to localStorage", () => {
    useAuthStore.getState().setAuth({ id: "1", email: "a@b.com", name: "Test" }, "secret");
    const stored = JSON.parse(localStorage.getItem("auth-storage") ?? "{}");
    expect(stored.state).toHaveProperty("user");
    expect(stored.state).toHaveProperty("isAuthenticated");
    expect(stored.state).not.toHaveProperty("accessToken");
  });
});
