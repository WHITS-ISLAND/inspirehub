import { test, expect, describe } from "bun:test";
import { sign } from "hono/jwt";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyJwt,
  type AccessTokenPayload,
  type RefreshTokenPayload,
} from "./jwt";

const SECRET = "test-secret";
const OTHER_SECRET = "other-secret";

describe("generateAccessToken", () => {
  test("アクセストークンのペイロードにsub・email・type=accessを含む", async () => {
    const token = await generateAccessToken("user-1", "user@example.com", SECRET);
    const payload = await verifyJwt<AccessTokenPayload>(token, SECRET);

    expect(payload).not.toBeNull();
    expect(payload!.sub).toBe("user-1");
    expect(payload!.email).toBe("user@example.com");
    expect(payload!.type).toBe("access");
  });

  test("有効期限を15分後に設定する", async () => {
    const before = Math.floor(Date.now() / 1000);
    const token = await generateAccessToken("user-1", "user@example.com", SECRET);
    const after = Math.floor(Date.now() / 1000);
    const payload = await verifyJwt<AccessTokenPayload>(token, SECRET);

    expect(payload!.exp).toBeGreaterThanOrEqual(before + 15 * 60);
    expect(payload!.exp).toBeLessThanOrEqual(after + 15 * 60);
  });
});

describe("generateRefreshToken", () => {
  test("リフレッシュトークンのペイロードにsub・family_id・jti・type=refreshを含む", async () => {
    const token = await generateRefreshToken("user-1", "family-1", "jti-1", SECRET);
    const payload = await verifyJwt<RefreshTokenPayload>(token, SECRET);

    expect(payload).not.toBeNull();
    expect(payload!.sub).toBe("user-1");
    expect(payload!.family_id).toBe("family-1");
    expect(payload!.jti).toBe("jti-1");
    expect(payload!.type).toBe("refresh");
  });

  test("有効期限を30日後に設定する", async () => {
    const before = Math.floor(Date.now() / 1000);
    const token = await generateRefreshToken("user-1", "family-1", "jti-1", SECRET);
    const after = Math.floor(Date.now() / 1000);
    const payload = await verifyJwt<RefreshTokenPayload>(token, SECRET);

    const thirtyDays = 30 * 24 * 60 * 60;
    expect(payload!.exp).toBeGreaterThanOrEqual(before + thirtyDays);
    expect(payload!.exp).toBeLessThanOrEqual(after + thirtyDays);
  });
});

describe("verifyJwt", () => {
  test("有効なトークンからペイロードを返す", async () => {
    const now = Math.floor(Date.now() / 1000);
    const token = await sign({ sub: "user-1", iat: now, exp: now + 900 }, SECRET, "HS256");
    const payload = await verifyJwt(token, SECRET);

    expect(payload).not.toBeNull();
    expect(payload!.sub).toBe("user-1");
  });

  test("無効なトークンに対してnullを返す", async () => {
    const payload = await verifyJwt("invalid-token", SECRET);
    expect(payload).toBeNull();
  });

  test("異なるシークレットで署名されたトークンに対してnullを返す", async () => {
    const now = Math.floor(Date.now() / 1000);
    const token = await sign({ sub: "user-1", iat: now, exp: now + 900 }, SECRET, "HS256");
    const payload = await verifyJwt(token, OTHER_SECRET);

    expect(payload).toBeNull();
  });
});
