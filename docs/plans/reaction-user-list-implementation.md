# Implementation Plan: Reaction User List API

## Overview
投稿（nodes）に対する各リアクション（like、interested、want_to_try）のユーザー一覧を取得するAPIを実装します。

**関連ADR**: [ADR-0001: Reaction User List API Design](../adr/0001-reaction-user-list-api-design.md)

## Architecture Decision Summary
- **API Design**: Individual Endpoints（リアクションタイプごとに独立したエンドポイント）
- **Pagination**: Cursor-based（`created_at` タイムスタンプ）
- **Default Limit**: 30ユーザー/リクエスト（10-100の範囲で調整可能）

## API Endpoints

### 1. GET /nodes/:id/reactions/like
likeリアクションのユーザー一覧を取得

### 2. GET /nodes/:id/reactions/interested
interestedリアクションのユーザー一覧を取得

### 3. GET /nodes/:id/reactions/want-to-try
want_to_tryリアクションのユーザー一覧を取得

## Implementation Tasks

### Phase 1: Backend API Implementation

#### Task 1.1: Schema Definition
**File**: `apps/api/src/schemas/reaction.ts`

```typescript
import { type } from "arktype"

// Response schema for reaction user list
export const ReactionUserInfoSchema = type({
  user_id: "string",
  user_name: "string",
  "user_picture?": "string | null",
  reacted_at: "string" // ISO8601
})

export const ReactionUserListResponseSchema = type({
  data: type([ReactionUserInfoSchema]),
  next_cursor: "string | null",
  has_more: "boolean",
  total: "number"
})

export type ReactionUserInfo = typeof ReactionUserInfoSchema.infer
export type ReactionUserListResponse = typeof ReactionUserListResponseSchema.infer

// Query params schema
export const ReactionUserListQuerySchema = type({
  "limit?": "number >= 10 <= 100",
  "cursor?": "string"
})

export type ReactionUserListQuery = typeof ReactionUserListQuerySchema.infer
```

**Acceptance Criteria**:
- [ ] スキーマが型安全に定義されている
- [ ] arktypeのバリデーションルールが適切（limit: 10-100）
- [ ] レスポンス型がエクスポートされている

---

#### Task 1.2: NodeService Methods
**File**: `apps/api/src/services/node.ts`

新しいメソッドを追加:

```typescript
async getReactionUsers(
  nodeId: string,
  reactionType: "like" | "interested" | "want_to_try",
  limit: number = 30,
  cursor?: string
): Promise<ReactionUserListResponse> {
  // Implementation details:
  // 1. Determine table name based on reactionType
  // 2. Join with users table to get user info
  // 3. Apply cursor filtering (created_at < cursor)
  // 4. Order by created_at DESC
  // 5. Limit to limit + 1 (for has_more check)
  // 6. Map to ReactionUserInfo format
  // 7. Return with pagination metadata
}
```

**Implementation Details**:

```typescript
async getReactionUsers(
  nodeId: string,
  reactionType: "like" | "interested" | "want_to_try",
  limit = 30,
  cursor?: string
): Promise<ReactionUserListResponse> {
  // Map reaction type to table name
  const tableName = this.getReactionTableName(reactionType)

  // Build base query
  let query = this.db
    .selectFrom(tableName)
    .innerJoin("users", "users.id", `${tableName}.user_id`)
    .select([
      "users.id as user_id",
      "users.name as user_name",
      "users.picture as user_picture",
      `${tableName}.created_at as reacted_at`
    ])
    .where(`${tableName}.node_id`, "=", nodeId)
    .orderBy(`${tableName}.created_at`, "desc")

  // Apply cursor filter
  if (cursor) {
    query = query.where(`${tableName}.created_at`, "<", cursor)
  }

  // Fetch limit + 1 to check if more data exists
  const results = await query.limit(limit + 1).execute()

  // Check if more data exists
  const has_more = results.length > limit
  const data = has_more ? results.slice(0, limit) : results

  // Get total count
  const totalResult = await this.db
    .selectFrom(tableName)
    .where("node_id", "=", nodeId)
    .select((eb) => eb.fn.count("user_id").as("count"))
    .executeTakeFirst()

  const total = Number(totalResult?.count ?? 0)

  // Determine next cursor
  const next_cursor = has_more && data.length > 0
    ? data[data.length - 1].reacted_at
    : null

  return {
    data: data.map(row => ({
      user_id: row.user_id,
      user_name: row.user_name,
      user_picture: row.user_picture,
      reacted_at: row.reacted_at
    })),
    next_cursor,
    has_more,
    total
  }
}

private getReactionTableName(
  reactionType: "like" | "interested" | "want_to_try"
): string {
  switch (reactionType) {
    case "like":
      return "likes"
    case "interested":
      return "interested"
    case "want_to_try":
      return "want_to_try"
  }
}
```

**Acceptance Criteria**:
- [ ] 正しいテーブルからユーザー情報を取得
- [ ] usersテーブルとJOINして名前と画像を取得
- [ ] カーソルベースのページネーションが動作
- [ ] has_moreが正しく計算される
- [ ] 総数（total）が返される
- [ ] created_at DESCでソート

---

#### Task 1.3: Route Handlers
**File**: `apps/api/src/routes/nodes.ts`

既存のリアクションエンドポイントの下に追加:

```typescript
import { ReactionUserListQuerySchema, ReactionUserListResponseSchema } from "../schemas/reaction"

// GET /nodes/:id/reactions/like
app.get(
  "/:id/reactions/like",
  describeRoute({
    tags: ["nodes"],
    summary: "Get users who liked this node",
    responses: {
      200: {
        description: "List of users who liked",
        content: {
          "application/json": {
            schema: ReactionUserListResponseSchema
          }
        }
      },
      404: {
        description: "Node not found"
      }
    }
  }),
  async (c) => {
    const nodeId = c.req.param("id")
    const query = ReactionUserListQuerySchema(c.req.query())

    if (query instanceof type.errors) {
      return c.json({ error: "Invalid query parameters" }, 400)
    }

    const { limit = 30, cursor } = query

    const nodeService = new NodeService(c.env.DB)

    // Check if node exists
    const node = await nodeService.getNodeById(nodeId)
    if (!node) {
      return c.json({ error: "Node not found" }, 404)
    }

    const result = await nodeService.getReactionUsers(
      nodeId,
      "like",
      limit,
      cursor
    )

    return c.json(result)
  }
)

// GET /nodes/:id/reactions/interested
app.get(
  "/:id/reactions/interested",
  describeRoute({
    tags: ["nodes"],
    summary: "Get users who are interested in this node",
    responses: {
      200: {
        description: "List of users who are interested",
        content: {
          "application/json": {
            schema: ReactionUserListResponseSchema
          }
        }
      },
      404: {
        description: "Node not found"
      }
    }
  }),
  async (c) => {
    const nodeId = c.req.param("id")
    const query = ReactionUserListQuerySchema(c.req.query())

    if (query instanceof type.errors) {
      return c.json({ error: "Invalid query parameters" }, 400)
    }

    const { limit = 30, cursor } = query

    const nodeService = new NodeService(c.env.DB)

    const node = await nodeService.getNodeById(nodeId)
    if (!node) {
      return c.json({ error: "Node not found" }, 404)
    }

    const result = await nodeService.getReactionUsers(
      nodeId,
      "interested",
      limit,
      cursor
    )

    return c.json(result)
  }
)

// GET /nodes/:id/reactions/want-to-try
app.get(
  "/:id/reactions/want-to-try",
  describeRoute({
    tags: ["nodes"],
    summary: "Get users who want to try this node",
    responses: {
      200: {
        description: "List of users who want to try",
        content: {
          "application/json": {
            schema: ReactionUserListResponseSchema
          }
        }
      },
      404: {
        description: "Node not found"
      }
    }
  }),
  async (c) => {
    const nodeId = c.req.param("id")
    const query = ReactionUserListQuerySchema(c.req.query())

    if (query instanceof type.errors) {
      return c.json({ error: "Invalid query parameters" }, 400)
    }

    const { limit = 30, cursor } = query

    const nodeService = new NodeService(c.env.DB)

    const node = await nodeService.getNodeById(nodeId)
    if (!node) {
      return c.json({ error: "Node not found" }, 404)
    }

    const result = await nodeService.getReactionUsers(
      nodeId,
      "want_to_try",
      limit,
      cursor
    )

    return c.json(result)
  }
)
```

**Acceptance Criteria**:
- [ ] 3つのエンドポイントすべてが実装されている
- [ ] OpenAPI docstringが追加されている
- [ ] クエリパラメータのバリデーションが動作
- [ ] 404エラーハンドリングが実装されている
- [ ] デフォルトlimit=30が適用される

---

#### Task 1.4: Unit Tests
**File**: `apps/api/src/services/node.test.ts`

新しいテストケースを追加:

```typescript
describe("NodeService.getReactionUsers", () => {
  test("should return users who liked a node", async () => {
    // Setup: Create node and likes
    const node = await nodeService.createNode(...)
    await nodeService.toggleLike(node.id, user1.id)
    await nodeService.toggleLike(node.id, user2.id)

    // Execute
    const result = await nodeService.getReactionUsers(node.id, "like", 30)

    // Assert
    expect(result.data).toHaveLength(2)
    expect(result.total).toBe(2)
    expect(result.has_more).toBe(false)
    expect(result.next_cursor).toBeNull()
  })

  test("should return users who are interested", async () => {
    // Similar test for interested
  })

  test("should return users who want to try", async () => {
    // Similar test for want_to_try
  })

  test("should paginate correctly with cursor", async () => {
    // Setup: Create 35 likes
    const node = await nodeService.createNode(...)
    for (let i = 0; i < 35; i++) {
      const user = await createTestUser(`user${i}`)
      await nodeService.toggleLike(node.id, user.id)
    }

    // First page
    const page1 = await nodeService.getReactionUsers(node.id, "like", 30)
    expect(page1.data).toHaveLength(30)
    expect(page1.has_more).toBe(true)
    expect(page1.next_cursor).not.toBeNull()
    expect(page1.total).toBe(35)

    // Second page
    const page2 = await nodeService.getReactionUsers(
      node.id,
      "like",
      30,
      page1.next_cursor!
    )
    expect(page2.data).toHaveLength(5)
    expect(page2.has_more).toBe(false)
    expect(page2.next_cursor).toBeNull()
    expect(page2.total).toBe(35)
  })

  test("should return empty array for node with no reactions", async () => {
    const node = await nodeService.createNode(...)

    const result = await nodeService.getReactionUsers(node.id, "like", 30)

    expect(result.data).toHaveLength(0)
    expect(result.total).toBe(0)
    expect(result.has_more).toBe(false)
    expect(result.next_cursor).toBeNull()
  })

  test("should respect limit parameter", async () => {
    // Setup: Create 50 likes
    const node = await nodeService.createNode(...)
    for (let i = 0; i < 50; i++) {
      const user = await createTestUser(`user${i}`)
      await nodeService.toggleLike(node.id, user.id)
    }

    // Execute with limit=10
    const result = await nodeService.getReactionUsers(node.id, "like", 10)

    expect(result.data).toHaveLength(10)
    expect(result.has_more).toBe(true)
    expect(result.total).toBe(50)
  })

  test("should include user name and picture", async () => {
    const node = await nodeService.createNode(...)
    const user = await createTestUser("testuser", {
      name: "Test User",
      picture: "https://example.com/pic.jpg"
    })
    await nodeService.toggleLike(node.id, user.id)

    const result = await nodeService.getReactionUsers(node.id, "like", 30)

    expect(result.data[0]).toMatchObject({
      user_id: user.id,
      user_name: "Test User",
      user_picture: "https://example.com/pic.jpg"
    })
  })
})
```

**Acceptance Criteria**:
- [ ] 各リアクションタイプのテストが追加
- [ ] ページネーションのテストが動作
- [ ] 空配列のケースをテスト
- [ ] limitパラメータのテスト
- [ ] ユーザー情報（名前・画像）が正しく含まれることをテスト
- [ ] `bun test` がすべてパス

---

#### Task 1.5: Integration Tests
**File**: `apps/api/src/routes/nodes.test.ts`

エンドツーエンドのAPIテストを追加:

```typescript
describe("GET /nodes/:id/reactions/like", () => {
  test("should return 200 with user list", async () => {
    const node = await createTestNode()
    const user = await createTestUser()
    await toggleLike(node.id, user.id)

    const res = await app.request(
      `/nodes/${node.id}/reactions/like`,
      { headers: { Authorization: `Bearer ${token}` } }
    )

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toHaveLength(1)
    expect(body.total).toBe(1)
  })

  test("should return 404 for non-existent node", async () => {
    const res = await app.request("/nodes/nonexistent/reactions/like")
    expect(res.status).toBe(404)
  })

  test("should validate limit parameter", async () => {
    const node = await createTestNode()

    // Too small
    const res1 = await app.request(
      `/nodes/${node.id}/reactions/like?limit=5`
    )
    expect(res1.status).toBe(400)

    // Too large
    const res2 = await app.request(
      `/nodes/${node.id}/reactions/like?limit=200`
    )
    expect(res2.status).toBe(400)

    // Valid
    const res3 = await app.request(
      `/nodes/${node.id}/reactions/like?limit=50`
    )
    expect(res3.status).toBe(200)
  })

  test("should work with cursor pagination", async () => {
    const node = await createTestNode()
    // Create 35 likes

    const page1 = await app.request(
      `/nodes/${node.id}/reactions/like?limit=30`
    )
    const body1 = await page1.json()

    expect(body1.next_cursor).not.toBeNull()

    const page2 = await app.request(
      `/nodes/${node.id}/reactions/like?limit=30&cursor=${body1.next_cursor}`
    )
    const body2 = await page2.json()

    expect(body2.data).toHaveLength(5)
    expect(body2.next_cursor).toBeNull()
  })
})

// Similar tests for /reactions/interested and /reactions/want-to-try
```

**Acceptance Criteria**:
- [ ] 3つのエンドポイントすべてに対するテスト
- [ ] 200, 404レスポンスのテスト
- [ ] バリデーションエラーのテスト
- [ ] ページネーションの動作テスト

---

### Phase 2: Documentation

#### Task 2.1: OpenAPI Documentation
**Verification**:
- [ ] `/openapi.json` にエンドポイントが含まれる
- [ ] `/docs` のScalar UIで確認可能
- [ ] サンプルリクエスト・レスポンスが表示される

#### Task 2.2: README Update
**File**: `apps/api/README.md`

新しいエンドポイントをドキュメントに追加:

```markdown
### Reaction User Lists

Get list of users who reacted to a node.

#### GET /nodes/:id/reactions/like
Get users who liked the node.

**Query Parameters:**
- `limit` (optional): Number of users to return (10-100, default: 30)
- `cursor` (optional): Cursor for pagination (ISO8601 timestamp)

**Response:**
```json
{
  "data": [
    {
      "user_id": "user123",
      "user_name": "John Doe",
      "user_picture": "https://example.com/pic.jpg",
      "reacted_at": "2024-01-15T10:30:00Z"
    }
  ],
  "next_cursor": "2024-01-14T09:20:00Z",
  "has_more": true,
  "total": 45
}
```

#### GET /nodes/:id/reactions/interested
Get users who are interested in the node.

(Same format as above)

#### GET /nodes/:id/reactions/want-to-try
Get users who want to try the node.

(Same format as above)
```

**Acceptance Criteria**:
- [ ] 3つのエンドポイントすべてがドキュメント化
- [ ] クエリパラメータが説明されている
- [ ] レスポンス例が含まれている

---

### Phase 3: Performance & Optimization

#### Task 3.1: Database Index Verification
**File**: `apps/api/schema.sql`

既存のインデックスを確認:

```sql
-- Verify these indexes exist
CREATE INDEX idx_likes_node_id ON likes(node_id);
CREATE INDEX idx_likes_user_id ON likes(user_id);
CREATE INDEX idx_interested_node_id ON interested(node_id);
CREATE INDEX idx_interested_user_id ON interested(user_id);
CREATE INDEX idx_want_to_try_node_id ON want_to_try(node_id);
CREATE INDEX idx_want_to_try_user_id ON want_to_try(user_id);
```

カーソルベースのページネーション用に `created_at` のインデックスも検討:

```sql
-- Consider adding composite indexes for pagination
CREATE INDEX idx_likes_node_created ON likes(node_id, created_at DESC);
CREATE INDEX idx_interested_node_created ON interested(node_id, created_at DESC);
CREATE INDEX idx_want_to_try_node_created ON want_to_try(node_id, created_at DESC);
```

**Acceptance Criteria**:
- [ ] 既存インデックスが存在することを確認
- [ ] ページネーション用の複合インデックスを評価
- [ ] 必要に応じてマイグレーションを作成

#### Task 3.2: Query Performance Testing

パフォーマンステストケースを追加:

```typescript
test("should handle large reaction lists efficiently", async () => {
  // Create node with 1000 likes
  const node = await createTestNode()
  for (let i = 0; i < 1000; i++) {
    const user = await createTestUser(`user${i}`)
    await nodeService.toggleLike(node.id, user.id)
  }

  const startTime = Date.now()
  const result = await nodeService.getReactionUsers(node.id, "like", 30)
  const duration = Date.now() - startTime

  expect(duration).toBeLessThan(100) // Should complete within 100ms
  expect(result.data).toHaveLength(30)
})
```

**Acceptance Criteria**:
- [ ] 大量データでのクエリが100ms以内
- [ ] ページネーションが効率的に動作

---

## Verification Checklist

### Backend
- [ ] すべてのスキーマが定義されている
- [ ] NodeServiceに `getReactionUsers` メソッドが実装
- [ ] 3つのGETエンドポイントが実装
- [ ] すべてのユニットテストがパス
- [ ] すべての統合テストがパス
- [ ] `bun run lint` がエラーなし
- [ ] `bun test` がすべてパス

### API
- [ ] OpenAPI仕様が更新されている
- [ ] `/docs` で新しいエンドポイントが確認可能
- [ ] READMEが更新されている

### Performance
- [ ] DBインデックスが最適化されている
- [ ] クエリパフォーマンスが要件を満たす

## Rollout Strategy

### Step 1: Backend Implementation (This Plan)
- API実装とテスト
- ドキュメント更新

### Step 2: Frontend Integration (Separate Issue)
- React hooks for infinite scroll
- UI components for reaction user lists
- モバイル: ボトムシート実装
- Web: モーダル or ポップオーバー実装

### Step 3: Monitoring & Optimization
- API使用状況のモニタリング
- キャッシュ戦略の実装
- パフォーマンスチューニング

## Timeline Estimate

| Phase | Tasks | Estimated Effort |
|-------|-------|------------------|
| Phase 1.1-1.3 | Schema + Service + Routes | 0.5 day |
| Phase 1.4-1.5 | Tests | 0.5 day |
| Phase 2 | Documentation | 0.25 day |
| Phase 3 | Performance | 0.25 day |
| **Total** | | **1.5 days** |

## Success Criteria

1. ✅ 3つのエンドポイントが動作している
2. ✅ カーソルベースのページネーションが実装されている
3. ✅ すべてのテストがパスする
4. ✅ OpenAPIドキュメントが更新されている
5. ✅ クエリパフォーマンスが100ms以内
6. ✅ snake_case命名規則が守られている

## Future Enhancements

1. **キャッシュ戦略**
   - Redis/KVでユーザーリストをキャッシュ
   - リアクション追加/削除時にキャッシュ無効化

2. **リアルタイム更新**
   - WebSocketで新しいリアクションを配信
   - 表示中のユーザーリストをリアルタイム更新

3. **Batch Endpoint（必要に応じて）**
   - 複数リアクションタイプを一度に取得
   - GraphQL実装の検討

4. **Analytics**
   - どのリアクションタイプが最も展開されるかを分析
   - ユーザーリスト表示の利用状況を追跡

## References
- ADR-0001: Reaction User List API Design
- Issue #44: 投稿に対するいいね・きになる・やってみたい 一覧を表示する機能
- Existing implementation: `apps/api/src/routes/nodes.ts` (lines 411-589)
