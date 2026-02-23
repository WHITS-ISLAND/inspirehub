import type { Kysely } from "kysely";
import type { Database } from "../lib/db";

interface CommentMention {
  id: string;
  name: string | null;
  picture: string | null;
}

interface CommentReply {
  id: string;
  node_id: string;
  parent_id: string | null;
  author_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  author_name: string | null;
  author_picture: string | null;
  mentions: CommentMention[];
  replies: CommentReply[];
}

interface CommentRow {
  id: string;
  node_id: string;
  parent_id: string | null;
  author_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  author_name: string | null;
  author_picture: string | null;
}

function buildCommentTree(
  topLevel: CommentRow[],
  allReplies: CommentRow[],
  mentionMap: Map<string, CommentMention[]>,
): CommentReply[] {
  const childrenMap = new Map<string, CommentRow[]>();
  for (const reply of allReplies) {
    if (!reply.parent_id) continue;
    const list = childrenMap.get(reply.parent_id) ?? [];
    list.push(reply);
    childrenMap.set(reply.parent_id, list);
  }

  function buildNode(row: CommentRow): CommentReply {
    const children = childrenMap.get(row.id) ?? [];
    return {
      ...row,
      mentions: mentionMap.get(row.id) ?? [],
      replies: children.map(buildNode),
    };
  }

  return topLevel.map(buildNode);
}

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

    // Create comment
    await this.db
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

      await this.db.insertInto("comment_mentions").values(mentionValues).execute();
    }

    return commentId;
  }

  async getByNodeId(
    nodeId: string,
    params?: {
      limit?: number;
      offset?: number;
    },
  ) {
    const countResult = await this.db
      .selectFrom("comments")
      .select((eb) => eb.fn.countAll().as("count"))
      .where("comments.node_id", "=", nodeId)
      .where("comments.parent_id", "is", null)
      .executeTakeFirst();
    const total = Number(countResult?.count || 0);

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

    if (topLevelComments.length === 0) {
      return { data: [], total };
    }

    const topLevelIds = topLevelComments.map((c) => c.id);

    // Batch: fetch all descendant comments for these top-level comments
    const allReplies = await this.db
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
      .where("comments.parent_id", "is not", null)
      .orderBy("comments.created_at", "asc")
      .execute();

    // Batch: fetch all mentions for all comments at once
    const allCommentIds = [...topLevelIds, ...allReplies.map((r) => r.id)];
    const allMentions = await this.getBatchMentions(allCommentIds);

    // Build tree in memory
    const commentsWithReplies = buildCommentTree(topLevelComments, allReplies, allMentions);

    return { data: commentsWithReplies, total };
  }

  async getMentions(commentId: string) {
    const mentions = await this.db
      .selectFrom("comment_mentions")
      .innerJoin("users", "comment_mentions.mentioned_user_id", "users.id")
      .select(["users.id", "users.name", "users.picture"])
      .where("comment_mentions.comment_id", "=", commentId)
      .execute();

    return mentions;
  }

  private async getBatchMentions(commentIds: string[]) {
    if (commentIds.length === 0) return new Map<string, CommentMention[]>();

    const mentions = await this.db
      .selectFrom("comment_mentions")
      .innerJoin("users", "comment_mentions.mentioned_user_id", "users.id")
      .select([
        "comment_mentions.comment_id",
        "users.id",
        "users.name",
        "users.picture",
      ])
      .where("comment_mentions.comment_id", "in", commentIds)
      .execute();

    const mentionMap = new Map<string, CommentMention[]>();
    for (const m of mentions) {
      const list = mentionMap.get(m.comment_id) ?? [];
      list.push({ id: m.id, name: m.name, picture: m.picture });
      mentionMap.set(m.comment_id, list);
    }
    return mentionMap;
  }

  async update(
    id: string,
    params: {
      content: string;
      mentions?: string[];
    },
  ) {
    const now = new Date().toISOString();

    // Update comment
    await this.db
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
      await this.db.deleteFrom("comment_mentions").where("comment_id", "=", id).execute();

      // Add new mentions
      if (params.mentions.length > 0) {
        const mentionValues = params.mentions.map((userId) => ({
          comment_id: id,
          mentioned_user_id: userId,
          created_at: now,
        }));

        await this.db.insertInto("comment_mentions").values(mentionValues).execute();
      }
    }
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

  async getCommentMeta(
    id: string,
  ): Promise<{ id: string; author_id: string; node_id: string } | null> {
    return (
      (await this.db
        .selectFrom("comments")
        .select(["id", "author_id", "node_id"])
        .where("id", "=", id)
        .executeTakeFirst()) ?? null
    );
  }

  async extractMentions(content: string): Promise<string[]> {
    // Extract @username mentions from content
    const mentionPattern = /@(\w+)/g;
    const matches = content.match(mentionPattern);

    if (!matches) return [];

    const usernames = matches.map((match) => match.substring(1)); // Remove @

    // Get user IDs from usernames
    const users = await this.db
      .selectFrom("users")
      .select(["id", "name"])
      .where("name", "in", usernames)
      .execute();

    return users.map((user) => user.id);
  }
}
