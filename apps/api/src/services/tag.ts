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
    let baseQuery = this.db.selectFrom("tags");

    if (params?.search) {
      baseQuery = baseQuery.where("tags.name", "like", `%${params.search}%`);
    }

    const countResult = await baseQuery
      .select((eb) => eb.fn.countAll().as("count"))
      .executeTakeFirst();
    const total = Number(countResult?.count || 0);

    let query = baseQuery
      .leftJoin("node_tags", "tags.id", "node_tags.tag_id")
      .select(["tags.id", "tags.name", "tags.created_at"])
      .select((eb) => [eb.fn.count<number>("node_tags.node_id").as("usage_count")])
      .groupBy(["tags.id", "tags.name", "tags.created_at"])
      .orderBy("usage_count", "desc")
      .orderBy("tags.name", "asc");

    if (params?.limit) {
      query = query.limit(params.limit);
    }

    if (params?.offset) {
      query = query.offset(params.offset);
    }

    const tags = await query.execute();

    return {
      data: tags.map((tag) => ({
        ...tag,
        usage_count: Number(tag.usage_count),
      })),
      total,
    };
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

  async existsById(id: string): Promise<boolean> {
    const row = await this.db.selectFrom("tags").select("id").where("id", "=", id).executeTakeFirst();
    return !!row;
  }

  async existsByName(name: string): Promise<boolean> {
    const row = await this.db
      .selectFrom("tags")
      .select("id")
      .where("name", "=", name)
      .executeTakeFirst();
    return !!row;
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
