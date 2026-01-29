import type { Kysely } from "kysely";
import type { Database, CommentsTable } from "../lib/db";

export class CommentService {
  constructor(private db: Kysely<Database>) {}

  async create(params: {
    node_id: string;
    parent_id?: string | null;
    author_id: string;
    content: string;
    mentions?: string[];
  }) {
    const commentId = crypto.randomUUID();
    const now = new Date().toISOString();

    await this.db.transaction().execute(async (trx) => {
      // Create comment
      await trx
        .insertInto("comments")
        .values({
          id: commentId,
          node_id: params.node_id,
          parent_id: params.parent_id || null,
          author_id: params.author_id,
          content: params.content,
          created_at: now,
          updated_at: now,
        })
        .execute();

      // Handle mentions if provided
      if (params.mentions && params.mentions.length > 0) {
        const mentionValues = params.mentions.map((userId) => ({
          comment_id: commentId,
          mentioned_user_id: userId,
          created_at: now,
        }));

        await trx
          .insertInto("comment_mentions")
          .values(mentionValues)
          .execute();
      }
    });

    return commentId;
  }

  async getByNodeId(
    nodeId: string,
    params?: {
      limit?: number;
      offset?: number;
    }
  ) {
    // Get top-level comments
    const topLevelComments = await this.db
      .selectFrom("comments")
      .leftJoin("users", "comments.author_id", "users.id")
      .select([
        "comments.id",
        "comments.node_id",
        "comments.parent_id",
        "comments.author_id",
        "comments.content",
        "comments.created_at",
        "comments.updated_at",
        "users.name as author_name",
        "users.picture as author_picture",
      ])
      .where("comments.node_id", "=", nodeId)
      .where("comments.parent_id", "is", null)
      .orderBy("comments.created_at", "desc")
      .limit(params?.limit || 50)
      .offset(params?.offset || 0)
      .execute();

    // Get replies for each top-level comment
    const commentsWithReplies = await Promise.all(
      topLevelComments.map(async (comment) => {
        const replies = await this.getReplies(comment.id);
        const mentions = await this.getMentions(comment.id);

        return {
          ...comment,
          mentions,
          replies,
        };
      })
    );

    return commentsWithReplies;
  }

  async getReplies(parentId: string) {
    const replies = await this.db
      .selectFrom("comments")
      .leftJoin("users", "comments.author_id", "users.id")
      .select([
        "comments.id",
        "comments.node_id",
        "comments.parent_id",
        "comments.author_id",
        "comments.content",
        "comments.created_at",
        "comments.updated_at",
        "users.name as author_name",
        "users.picture as author_picture",
      ])
      .where("comments.parent_id", "=", parentId)
      .orderBy("comments.created_at", "asc")
      .execute();

    // Recursively get replies for nested comments
    const repliesWithNested = await Promise.all(
      replies.map(async (reply) => {
        const nestedReplies = await this.getReplies(reply.id);
        const mentions = await this.getMentions(reply.id);

        return {
          ...reply,
          mentions,
          replies: nestedReplies,
        };
      })
    );

    return repliesWithNested;
  }

  async getMentions(commentId: string) {
    const mentions = await this.db
      .selectFrom("comment_mentions")
      .innerJoin("users", "comment_mentions.mentioned_user_id", "users.id")
      .select([
        "users.id",
        "users.name",
        "users.picture",
      ])
      .where("comment_mentions.comment_id", "=", commentId)
      .execute();

    return mentions;
  }

  async update(
    id: string,
    params: {
      content: string;
      mentions?: string[];
    }
  ) {
    const now = new Date().toISOString();

    await this.db.transaction().execute(async (trx) => {
      // Update comment
      await trx
        .updateTable("comments")
        .set({
          content: params.content,
          updated_at: now,
        })
        .where("id", "=", id)
        .execute();

      // Update mentions if provided
      if (params.mentions !== undefined) {
        // Remove existing mentions
        await trx
          .deleteFrom("comment_mentions")
          .where("comment_id", "=", id)
          .execute();

        // Add new mentions
        if (params.mentions.length > 0) {
          const mentionValues = params.mentions.map((userId) => ({
            comment_id: id,
            mentioned_user_id: userId,
            created_at: now,
          }));

          await trx
            .insertInto("comment_mentions")
            .values(mentionValues)
            .execute();
        }
      }
    });
  }

  async delete(id: string) {
    // Delete comment (cascades to mentions and child comments)
    await this.db.deleteFrom("comments").where("id", "=", id).execute();
  }

  async getById(id: string) {
    const comment = await this.db
      .selectFrom("comments")
      .leftJoin("users", "comments.author_id", "users.id")
      .select([
        "comments.id",
        "comments.node_id",
        "comments.parent_id",
        "comments.author_id",
        "comments.content",
        "comments.created_at",
        "comments.updated_at",
        "users.name as author_name",
        "users.picture as author_picture",
      ])
      .where("comments.id", "=", id)
      .executeTakeFirst();

    if (!comment) return null;

    const mentions = await this.getMentions(id);

    return {
      ...comment,
      mentions,
    };
  }

  async extractMentions(content: string): Promise<string[]> {
    // Extract @username mentions from content
    const mentionPattern = /@(\w+)/g;
    const matches = content.match(mentionPattern);

    if (!matches) return [];

    const usernames = matches.map(match => match.substring(1)); // Remove @

    // Get user IDs from usernames
    const users = await this.db
      .selectFrom("users")
      .select(["id", "name"])
      .where("name", "in", usernames)
      .execute();

    return users.map(user => user.id);
  }
}