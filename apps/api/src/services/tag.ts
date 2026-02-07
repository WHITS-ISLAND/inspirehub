import type { Kysely } from "kysely";
import type { Database } from "../lib/db";

export class TagService {
  constructor(private db: Kysely<Database>) {}

  async create(name: string) {
    const tagId = crypto.randomUUID();
    const now = new Date().toISOString();

    // Check if tag already exists
    const existing = await this.db
      .selectFrom("tags")
      .select("id")
      .where("name", "=", name)
      .executeTakeFirst();

    if (existing) {
      return { id: existing.id, created: false };
    }

    await this.db
      .insertInto("tags")
      .values({
        id: tagId,
        name,
        created_at: now,
      })
      .execute();

    return { id: tagId, created: true };
  }

  async list(params?: { search?: string; limit?: number; offset?: number }) {
    let query = this.db
      .selectFrom("tags")
      .leftJoin("node_tags", "tags.id", "node_tags.tag_id")
      .select(["tags.id", "tags.name", "tags.created_at"])
      .select((eb) => [eb.fn.count<number>("node_tags.node_id").as("usage_count")])
      .groupBy(["tags.id", "tags.name", "tags.created_at"]);

    if (params?.search) {
      query = query.where("tags.name", "like", `%${params.search}%`);
    }

    query = query.orderBy("usage_count", "desc").orderBy("tags.name", "asc");

    if (params?.limit) {
      query = query.limit(params.limit);
    }

    if (params?.offset) {
      query = query.offset(params.offset);
    }

    const tags = await query.execute();

    return tags.map((tag) => ({
      ...tag,
      usage_count: Number(tag.usage_count),
    }));
  }

  async getById(id: string) {
    const tag = await this.db
      .selectFrom("tags")
      .leftJoin("node_tags", "tags.id", "node_tags.tag_id")
      .select(["tags.id", "tags.name", "tags.created_at"])
      .select((eb) => [eb.fn.count<number>("node_tags.node_id").as("usage_count")])
      .where("tags.id", "=", id)
      .groupBy(["tags.id", "tags.name", "tags.created_at"])
      .executeTakeFirst();

    if (!tag) return null;

    return {
      ...tag,
      usage_count: Number(tag.usage_count),
    };
  }

  async getByName(name: string) {
    const tag = await this.db
      .selectFrom("tags")
      .leftJoin("node_tags", "tags.id", "node_tags.tag_id")
      .select(["tags.id", "tags.name", "tags.created_at"])
      .select((eb) => [eb.fn.count<number>("node_tags.node_id").as("usage_count")])
      .where("tags.name", "=", name)
      .groupBy(["tags.id", "tags.name", "tags.created_at"])
      .executeTakeFirst();

    if (!tag) return null;

    return {
      ...tag,
      usage_count: Number(tag.usage_count),
    };
  }

  async getPopularTags(limit: number = 10) {
    const tags = await this.db
      .selectFrom("tags")
      .leftJoin("node_tags", "tags.id", "node_tags.tag_id")
      .select(["tags.id", "tags.name", "tags.created_at"])
      .select((eb) => [eb.fn.count<number>("node_tags.node_id").as("usage_count")])
      .groupBy(["tags.id", "tags.name", "tags.created_at"])
      .having((eb) => eb.fn.count("node_tags.node_id"), ">", 0)
      .orderBy("usage_count", "desc")
      .limit(limit)
      .execute();

    return tags.map((tag) => ({
      ...tag,
      usage_count: Number(tag.usage_count),
    }));
  }

  async getNodesByTag(
    tagName: string,
    params?: {
      limit?: number;
      offset?: number;
    },
  ) {
    const nodes = await this.db
      .selectFrom("nodes")
      .innerJoin("node_tags", "nodes.id", "node_tags.node_id")
      .innerJoin("tags", "node_tags.tag_id", "tags.id")
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
      .where("tags.name", "=", tagName)
      .orderBy("nodes.created_at", "desc")
      .limit(params?.limit || 20)
      .offset(params?.offset || 0)
      .execute();

    const nodesWithDetails = await Promise.all(
      nodes.map(async (node) => {
        const tags = await this.db
          .selectFrom("node_tags")
          .innerJoin("tags", "node_tags.tag_id", "tags.id")
          .select(["tags.id", "tags.name"])
          .where("node_tags.node_id", "=", node.id)
          .execute();

        const parentNode = await this.db
          .selectFrom("edges")
          .innerJoin("nodes", "edges.source", "nodes.id")
          .select(["nodes.id", "nodes.type", "nodes.title"])
          .where("edges.target", "=", node.id)
          .executeTakeFirst();

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
          parent_node: parentNode ?? null,
        };
      }),
    );

    return nodesWithDetails;
  }

  async suggestTags(partial: string, limit: number = 5) {
    const tags = await this.db
      .selectFrom("tags")
      .select(["id", "name"])
      .where("name", "like", `${partial}%`)
      .orderBy("name", "asc")
      .limit(limit)
      .execute();

    return tags;
  }

  async delete(id: string) {
    // This will cascade delete all node_tags associations
    await this.db.deleteFrom("tags").where("id", "=", id).execute();
  }

  async rename(id: string, newName: string) {
    // Check if new name already exists
    const existing = await this.db
      .selectFrom("tags")
      .select("id")
      .where("name", "=", newName)
      .where("id", "!=", id)
      .executeTakeFirst();

    if (existing) {
      throw new Error("Tag with this name already exists");
    }

    await this.db.updateTable("tags").set({ name: newName }).where("id", "=", id).execute();
  }
}
