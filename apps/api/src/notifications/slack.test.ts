import { describe, it, expect, mock, beforeEach } from "bun:test";
import { SlackNotificationService } from "./slack";

let fetchCalls: { url: string | URL | Request; init?: RequestInit }[] = [];

function createMockDb(rows: Record<string, unknown>[]) {
  const chain = {
    selectFrom: () => chain,
    leftJoin: () => chain,
    select: () => chain,
    orderBy: () => chain,
    where: () => chain,
    execute: () => Promise.resolve(rows),
  };
  return chain as never;
}

function createMockKv(lastNotifiedAt: string | null = null) {
  return {
    get: mock(() => Promise.resolve(lastNotifiedAt)),
    put: mock(() => Promise.resolve()),
  } as unknown as KVNamespace;
}

function lastFetchPayload(): Record<string, unknown> {
  const last = fetchCalls[fetchCalls.length - 1];
  return JSON.parse(last.init?.body as string);
}

function mrkdwnTexts(payload: Record<string, unknown>): string[] {
  const blocks = payload.blocks as { type: string; text?: { text: string }; fields?: { text: string }[] }[];
  return blocks.flatMap((b) => {
    if (b.fields) return b.fields.map((f) => f.text);
    if (b.text?.text && b.type === "section") return [b.text.text];
    return [];
  });
}

const WEBHOOK_URL = "https://hooks.slack.com/test";
const CLIENT_URL = "https://example.com";

beforeEach(() => {
  fetchCalls = [];
  globalThis.fetch = ((url: string | URL | Request, init?: RequestInit) => {
    fetchCalls.push({ url, init });
    return Promise.resolve(new Response("ok"));
  }) as typeof fetch;
});

describe("SlackNotificationService", () => {
  describe("mrkdwnエスケープ", () => {
    it("リンク構文の < > がエスケープされる", async () => {
      const db = createMockDb([
        { id: "1", type: "idea", title: "<https://evil.com|Click>", content: "safe", author_name: "Alice", created_at: "2025-01-01" },
      ]);
      const service = new SlackNotificationService(db, createMockKv(), WEBHOOK_URL, CLIENT_URL);

      await service.notifyNewNodes();

      const texts = mrkdwnTexts(lastFetchPayload());
      expect(texts[0]).toContain("&lt;https://evil.com|Click&gt;");
      expect(texts[0]).not.toContain("<https://evil.com|Click>");
    });

    it("<!here> や <!channel> メンションがエスケープされる", async () => {
      const db = createMockDb([
        { id: "1", type: "issue", title: "<!here> <!channel>", content: "test", author_name: "Bob", created_at: "2025-01-01" },
      ]);
      const service = new SlackNotificationService(db, createMockKv(), WEBHOOK_URL, CLIENT_URL);

      await service.notifyNewNodes();

      const texts = mrkdwnTexts(lastFetchPayload());
      expect(texts[0]).toContain("&lt;!here&gt;");
      expect(texts[0]).not.toContain("<!here>");
    });

    it("author_name 内の mrkdwn がエスケープされる", async () => {
      const db = createMockDb([
        { id: "1", type: "idea", title: "ok", content: "ok", author_name: "<@U123>", created_at: "2025-01-01" },
      ]);
      const service = new SlackNotificationService(db, createMockKv(), WEBHOOK_URL, CLIENT_URL);

      await service.notifyNewNodes();

      const texts = mrkdwnTexts(lastFetchPayload());
      expect(texts[1]).toContain("&lt;@U123&gt;");
    });

    it("content 内の mrkdwn がエスケープされる", async () => {
      const db = createMockDb([
        { id: "1", type: "project", title: "ok", content: "<https://phish.example|重要>", author_name: "Eve", created_at: "2025-01-01" },
      ]);
      const service = new SlackNotificationService(db, createMockKv(), WEBHOOK_URL, CLIENT_URL);

      await service.notifyNewNodes();

      const texts = mrkdwnTexts(lastFetchPayload());
      expect(texts[2]).toContain("&lt;https://phish.example|重要&gt;");
    });

    it("& が二重エスケープを防ぐため最初に変換される", async () => {
      const db = createMockDb([
        { id: "1", type: "idea", title: "A&B <C>", content: "ok", author_name: "X", created_at: "2025-01-01" },
      ]);
      const service = new SlackNotificationService(db, createMockKv(), WEBHOOK_URL, CLIENT_URL);

      await service.notifyNewNodes();

      const texts = mrkdwnTexts(lastFetchPayload());
      expect(texts[0]).toContain("A&amp;B &lt;C&gt;");
    });

    it("特殊文字を含まないテキストはそのまま出力される", async () => {
      const db = createMockDb([
        { id: "1", type: "idea", title: "普通のタイトル", content: "普通の内容", author_name: "太郎", created_at: "2025-01-01" },
      ]);
      const service = new SlackNotificationService(db, createMockKv(), WEBHOOK_URL, CLIENT_URL);

      await service.notifyNewNodes();

      const texts = mrkdwnTexts(lastFetchPayload());
      expect(texts[0]).toBe("*タイトル*\n普通のタイトル");
      expect(texts[1]).toBe("*投稿者*\n太郎");
      expect(texts[2]).toBe("*詳細*\n普通の内容");
    });
  });
});
