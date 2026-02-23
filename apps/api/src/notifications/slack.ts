import type { Kysely } from "kysely";
import type { Database } from "../lib/db";

const KV_LAST_NOTIFIED_KEY = "slack:last_notified_at";

function escapeSlackMrkdwn(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

interface NewNode {
  id: string;
  type: string;
  title: string;
  content: string;
  author_name: string | null;
  created_at: string;
}

export class SlackNotificationService {
  constructor(
    private db: Kysely<Database>,
    private kv: KVNamespace,
    private webhookUrl: string,
    private clientUrl: string,
  ) {}

  async notifyNewNodes(): Promise<number> {
    const lastNotifiedAt = await this.kv.get(KV_LAST_NOTIFIED_KEY);
    const now = new Date().toISOString();

    // Get new nodes since last notification
    let query = this.db
      .selectFrom("nodes")
      .leftJoin("users", "nodes.author_id", "users.id")
      .select([
        "nodes.id",
        "nodes.type",
        "nodes.title",
        "nodes.content",
        "nodes.created_at",
        "users.name as author_name",
      ])
      .orderBy("nodes.created_at", "asc");

    if (lastNotifiedAt) {
      query = query.where("nodes.created_at", ">", lastNotifiedAt);
    }

    const newNodes = await query.execute();

    // Send individual notifications
    for (const node of newNodes) {
      await this.sendSlackMessage(node);
    }

    // Update last notified timestamp
    await this.kv.put(KV_LAST_NOTIFIED_KEY, now);

    return newNodes.length;
  }

  private async sendSlackMessage(node: NewNode): Promise<void> {
    const typeEmoji = {
      issue: "🔴",
      idea: "💡",
      project: "🚀",
    }[node.type] || "📝";

    const typeLabel = {
      issue: "Issue",
      idea: "Idea",
      project: "Project",
    }[node.type] || node.type;

    // TODO: Webページ実装後に有効化
    // Universal Links (iOS) / App Links (Android) 対応で
    // アプリがインストールされていればアプリで開く
    // const nodeUrl = `${this.clientUrl}/nodes/${node.id}`;
    const truncatedContent = node.content.length > 200
      ? node.content.slice(0, 200) + "..."
      : node.content;

    const payload = {
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: `${typeEmoji} 新しい${typeLabel}が投稿されました`,
            emoji: true,
          },
        },
        {
          type: "section",
          fields: [
            {
              type: "mrkdwn",
              text: `*タイトル*\n${escapeSlackMrkdwn(node.title)}`,
            },
            {
              type: "mrkdwn",
              text: `*投稿者*\n${escapeSlackMrkdwn(node.author_name || "Unknown")}`,
            },
          ],
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*詳細*\n${escapeSlackMrkdwn(truncatedContent)}`,
          },
        },
        // TODO: Webページ実装後に有効化
        // {
        //   type: "actions",
        //   elements: [
        //     {
        //       type: "button",
        //       text: {
        //         type: "plain_text",
        //         text: "詳細を見る",
        //         emoji: true,
        //       },
        //       url: nodeUrl,
        //     },
        //   ],
        // },
        {
          type: "divider",
        },
      ],
    };

    await fetch(this.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  }
}
