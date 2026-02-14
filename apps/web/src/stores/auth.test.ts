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

  test("初期状態は未認証である", () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
  });

  test("setAuthはユーザー・トークンを設定し認証済みにする", () => {
    const user = { id: "1", email: "a@b.com", name: "Test" };
    useAuthStore.getState().setAuth(user, "tok-123");
    const state = useAuthStore.getState();
    expect(state.user).toEqual(user);
    expect(state.accessToken).toBe("tok-123");
    expect(state.isAuthenticated).toBe(true);
  });

  test("setAuthは既存のエラーをクリアする", () => {
    useAuthStore.setState({ error: "old error" });
    useAuthStore.getState().setAuth({ id: "1", email: "a@b.com", name: "Test" }, "tok");
    expect(useAuthStore.getState().error).toBeNull();
  });

  test("setAccessTokenはアクセストークンのみ更新する", () => {
    useAuthStore.getState().setAuth({ id: "1", email: "a@b.com", name: "Test" }, "old");
    useAuthStore.getState().setAccessToken("new-tok");
    const state = useAuthStore.getState();
    expect(state.accessToken).toBe("new-tok");
    expect(state.user?.name).toBe("Test");
  });

  test("logoutはユーザー・トークン・認証状態をクリアする", () => {
    useAuthStore.getState().setAuth({ id: "1", email: "a@b.com", name: "Test" }, "tok");
    useAuthStore.getState().logout();
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });

  test("logoutは既存のエラーをクリアする", () => {
    useAuthStore.setState({ error: "some error" });
    useAuthStore.getState().logout();
    expect(useAuthStore.getState().error).toBeNull();
  });

  test("setLoadingはローディング状態を切り替える", () => {
    useAuthStore.getState().setLoading(true);
    expect(useAuthStore.getState().isLoading).toBe(true);
    useAuthStore.getState().setLoading(false);
    expect(useAuthStore.getState().isLoading).toBe(false);
  });

  test("setErrorはエラーメッセージを保存する", () => {
    useAuthStore.getState().setError("fail");
    expect(useAuthStore.getState().error).toBe("fail");
  });

  test("setError(null)はエラーメッセージをクリアする", () => {
    useAuthStore.setState({ error: "existing" });
    useAuthStore.getState().setError(null);
    expect(useAuthStore.getState().error).toBeNull();
  });

  test("localStorageにはuserとisAuthenticatedのみ永続化しaccessTokenは含まない", () => {
    useAuthStore.getState().setAuth({ id: "1", email: "a@b.com", name: "Test" }, "secret");
    const stored = JSON.parse(localStorage.getItem("auth-storage") ?? "{}");
    expect(stored.state).toHaveProperty("user");
    expect(stored.state).toHaveProperty("isAuthenticated");
    expect(stored.state).not.toHaveProperty("accessToken");
  });
});
