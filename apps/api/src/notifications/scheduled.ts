import { createDb } from "../lib/db";
import type { CloudflareBindings } from "../types/bindings";
import { SlackNotificationService } from "./slack";

export async function scheduled(
  _event: ScheduledEvent,
  env: CloudflareBindings,
  _ctx: ExecutionContext,
): Promise<void> {
  // Slack通知
  if (env.SLACK_WEBHOOK_URL) {
    const db = createDb(env.DB);
    const slackService = new SlackNotificationService(
      db,
      env.KV,
      env.SLACK_WEBHOOK_URL,
      env.CLIENT_URL,
    );

    const count = await slackService.notifyNewNodes();
    console.log(`Sent ${count} Slack notifications`);
  } else {
    console.log("SLACK_WEBHOOK_URL not configured, skipping Slack notification");
  }

  // 将来的に他の通知を追加
  // if (env.DISCORD_WEBHOOK_URL) { ... }
  // if (env.PUSH_NOTIFICATION_KEY) { ... }
}
