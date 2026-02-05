import type { Kysely } from "kysely";
import type { Database, NodesTable } from "../lib/db";

export class NodeService {
  constructor(private db: Kysely<Database>) {}

  async create(params: {
    type: NodesTable["type"];
    title: string;
    content: string;
    author_id: string;
    tags?: string[];
  }) {
    const nodeId = crypto.randomUUID();
    const now = new Date().toISOString();

    await this.db.transaction().execute(async (trx) => {
      // Create node
      await trx
        .insertInto("nodes")
        .values({
          id: nodeId,
          type: params.type,
          title: params.title,
          content: params.content,
          author_id: params.author_id,
          created_at: now,
          updated_at: now,
        })
        .execute();

      // Handle tags if provided
      if (params.tags && params.tags.length > 0) {
        for (const tagName of params.tags) {
          // Upsert tag
          let tagId = crypto.randomUUID();
          const existingTag = await trx
            .selectFrom("tags")
            .select("id")
            .where("name", "=", tagName)
            .executeTakeFirst();

          if (existingTag) {
            tagId = existingTag.id;
          } else {
            await trx
              .insertInto("tags")
              .values({
                id: tagId,
                name: tagName,
                created_at: now,
              })
              .execute();
          }

          // Create node-tag relation
          await trx
            .insertInto("node_tags")
            .values({
              node_id: nodeId,
              tag_id: tagId,
              created_at: now,
            })
            .execute();
        }
      }
    });

    return nodeId;
  }

  async getById(id: string) {
    const node = await this.db
      .selectFrom("nodes")
      .leftJoin("users", "nodes.author_id", "users.id")
      .select([
        "nodes.id",
        "nodes.type",
        "nodes.title",
        "nodes.content",
        "nodes.author_id",
        "nodes.created_at",
        "nodes.updated_at",
        "users.name as author_name",
        "users.picture as author_picture",
      ])
      .where("nodes.id", "=", id)
      .executeTakeFirst();

    if (!node) return null;

    // Get tags
    const tags = await this.db
      .selectFrom("node_tags")
      .innerJoin("tags", "node_tags.tag_id", "tags.id")
      .select(["tags.id", "tags.name"])
      .where("node_tags.node_id", "=", id)
      .execute();

    // Get reaction counts
    const [likeCount, interestedCount, wantToTryCount, commentCount] = await Promise.all([
      this.db
        .selectFrom("likes")
        .select((eb) => eb.fn.countAll().as("count"))
        .where("node_id", "=", id)
        .executeTakeFirst(),
      this.db
        .selectFrom("interested")
        .select((eb) => eb.fn.countAll().as("count"))
        .where("node_id", "=", id)
        .executeTakeFirst(),
      this.db
        .selectFrom("want_to_try")
        .select((eb) => eb.fn.countAll().as("count"))
        .where("node_id", "=", id)
        .executeTakeFirst(),
      this.db
        .selectFrom("comments")
        .select((eb) => eb.fn.countAll().as("count"))
        .where("node_id", "=", id)
        .executeTakeFirst(),
    ]);

    return {
      ...node,
      tags,
      reactions: {
        like: { count: Number(likeCount?.count || 0) },
        interested: { count: Number(interestedCount?.count || 0) },
        want_to_try: { count: Number(wantToTryCount?.count || 0) },
      },
      comment_count: Number(commentCount?.count || 0),
    };
  }

  async list(params?: {
    type?: NodesTable["type"];
    author_id?: string;
    tag?: string;
    limit?: number;
    offset?: number;
  }) {
    let query = this.db
      .selectFrom("nodes")
      .leftJoin("users", "nodes.author_id", "users.id")
      .select([
        "nodes.id",
        "nodes.type",
        "nodes.title",
        "nodes.author_id",
        "nodes.created_at",
        "nodes.updated_at",
        "users.name as author_name",
        "users.picture as author_picture",
      ]);

    if (params?.type) {
      query = query.where("nodes.type", "=", params.type);
    }

    if (params?.author_id) {
      query = query.where("nodes.author_id", "=", params.author_id);
    }

    if (params?.tag) {
      query = query
        .innerJoin("node_tags", "nodes.id", "node_tags.node_id")
        .innerJoin("tags", "node_tags.tag_id", "tags.id")
        .where("tags.name", "=", params.tag);
    }

    query = query.orderBy("nodes.created_at", "desc");

    if (params?.limit) {
      query = query.limit(params.limit);
    }

    if (params?.offset) {
      query = query.offset(params.offset);
    }

    const nodes = await query.execute();

    // Get tags and counts for each node
    const nodesWithDetails = await Promise.all(
      nodes.map(async (node) => {
        const tags = await this.db
          .selectFrom("node_tags")
          .innerJoin("tags", "node_tags.tag_id", "tags.id")
          .select(["tags.id", "tags.name"])
          .where("node_tags.node_id", "=", node.id)
          .execute();

        const [likeCount, interestedCount, wantToTryCount, commentCount] = await Promise.all([
          this.db
            .selectFrom("likes")
            .select((eb) => eb.fn.countAll().as("count"))
            .where("node_id", "=", node.id)
            .executeTakeFirst(),
          this.db
            .selectFrom("interested")
            .select((eb) => eb.fn.countAll().as("count"))
            .where("node_id", "=", node.id)
            .executeTakeFirst(),
          this.db
            .selectFrom("want_to_try")
            .select((eb) => eb.fn.countAll().as("count"))
            .where("node_id", "=", node.id)
            .executeTakeFirst(),
          this.db
            .selectFrom("comments")
            .select((eb) => eb.fn.countAll().as("count"))
            .where("node_id", "=", node.id)
            .executeTakeFirst(),
        ]);

        return {
          ...node,
          tags,
          reactions: {
            like: { count: Number(likeCount?.count || 0) },
            interested: { count: Number(interestedCount?.count || 0) },
            want_to_try: { count: Number(wantToTryCount?.count || 0) },
          },
          comment_count: Number(commentCount?.count || 0),
        };
      }),
    );

    return nodesWithDetails;
  }

  async update(
    id: string,
    params: {
      title?: string;
      content?: string;
      tags?: string[];
    },
  ) {
    const now = new Date().toISOString();

    await this.db.transaction().execute(async (trx) => {
      // Update node
      const updateData: Partial<NodesTable> = {
        updated_at: now,
      };

      if (params.title !== undefined) {
        updateData.title = params.title;
      }

      if (params.content !== undefined) {
        updateData.content = params.content;
      }

      await trx.updateTable("nodes").set(updateData).where("id", "=", id).execute();

      // Update tags if provided
      if (params.tags !== undefined) {
        // Remove existing tags
        await trx.deleteFrom("node_tags").where("node_id", "=", id).execute();

        // Add new tags
        for (const tagName of params.tags) {
          let tagId = crypto.randomUUID();
          const existingTag = await trx
            .selectFrom("tags")
            .select("id")
            .where("name", "=", tagName)
            .executeTakeFirst();

          if (existingTag) {
            tagId = existingTag.id;
          } else {
            await trx
              .insertInto("tags")
              .values({
                id: tagId,
                name: tagName,
                created_at: now,
              })
              .execute();
          }

          await trx
            .insertInto("node_tags")
            .values({
              node_id: id,
              tag_id: tagId,
              created_at: now,
            })
            .execute();
        }
      }
    });
  }

  async delete(id: string) {
    await this.db.deleteFrom("nodes").where("id", "=", id).execute();
  }

  async toggleLike(nodeId: string, userId: string) {
    const existing = await this.db
      .selectFrom("likes")
      .select("node_id")
      .where("node_id", "=", nodeId)
      .where("user_id", "=", userId)
      .executeTakeFirst();

    if (existing) {
      // Unlike
      await this.db
        .deleteFrom("likes")
        .where("node_id", "=", nodeId)
        .where("user_id", "=", userId)
        .execute();
      return { liked: false };
    } else {
      // Like
      await this.db
        .insertInto("likes")
        .values({
          node_id: nodeId,
          user_id: userId,
          created_at: new Date().toISOString(),
        })
        .execute();
      return { liked: true };
    }
  }

  async getUserLikeStatus(nodeIds: string[], userId: string) {
    if (nodeIds.length === 0) return {};
    const likes = await this.db
      .selectFrom("likes")
      .select("node_id")
      .where("node_id", "in", nodeIds)
      .where("user_id", "=", userId)
      .execute();

    const likedNodeIds = new Set(likes.map((l) => l.node_id));
    return Object.fromEntries(nodeIds.map((id) => [id, likedNodeIds.has(id)]));
  }

  async toggleInterested(nodeId: string, userId: string) {
    const existing = await this.db
      .selectFrom("interested")
      .select("node_id")
      .where("node_id", "=", nodeId)
      .where("user_id", "=", userId)
      .executeTakeFirst();

    if (existing) {
      // Remove interested
      await this.db
        .deleteFrom("interested")
        .where("node_id", "=", nodeId)
        .where("user_id", "=", userId)
        .execute();
      return { is_reacted: false };
    } else {
      // Add interested
      await this.db
        .insertInto("interested")
        .values({
          node_id: nodeId,
          user_id: userId,
          created_at: new Date().toISOString(),
        })
        .execute();
      return { is_reacted: true };
    }
  }

  async toggleWantToTry(nodeId: string, userId: string) {
    const existing = await this.db
      .selectFrom("want_to_try")
      .select("node_id")
      .where("node_id", "=", nodeId)
      .where("user_id", "=", userId)
      .executeTakeFirst();

    if (existing) {
      // Remove want_to_try
      await this.db
        .deleteFrom("want_to_try")
        .where("node_id", "=", nodeId)
        .where("user_id", "=", userId)
        .execute();
      return { is_reacted: false };
    } else {
      // Add want_to_try
      await this.db
        .insertInto("want_to_try")
        .values({
          node_id: nodeId,
          user_id: userId,
          created_at: new Date().toISOString(),
        })
        .execute();
      return { is_reacted: true };
    }
  }

  async getUserInterestedStatus(nodeIds: string[], userId: string) {
    if (nodeIds.length === 0) return {};
    const rows = await this.db
      .selectFrom("interested")
      .select("node_id")
      .where("node_id", "in", nodeIds)
      .where("user_id", "=", userId)
      .execute();

    const interestedNodeIds = new Set(rows.map((r) => r.node_id));
    return Object.fromEntries(nodeIds.map((id) => [id, interestedNodeIds.has(id)]));
  }

  async getUserWantToTryStatus(nodeIds: string[], userId: string) {
    if (nodeIds.length === 0) return {};
    const rows = await this.db
      .selectFrom("want_to_try")
      .select("node_id")
      .where("node_id", "in", nodeIds)
      .where("user_id", "=", userId)
      .execute();

    const wantToTryNodeIds = new Set(rows.map((r) => r.node_id));
    return Object.fromEntries(nodeIds.map((id) => [id, wantToTryNodeIds.has(id)]));
  }

  async getReactionCount(nodeId: string, reactionType: "like" | "interested" | "want_to_try") {
    const table = reactionType === "like" ? "likes" : reactionType;
    const result = await this.db
      .selectFrom(table)
      .select((eb) => eb.fn.countAll().as("count"))
      .where("node_id", "=", nodeId)
      .executeTakeFirst();
    return Number(result?.count || 0);
  }
}
