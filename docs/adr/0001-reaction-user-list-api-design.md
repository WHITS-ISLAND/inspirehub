# ADR-0001: Reaction User List API Design

## Status
Proposed

## Context
InspireHubでは、投稿（nodes）に対して3種類のリアクション（like、interested、want_to_try）が実装されています。現在は各リアクションの総数と自分がリアクションしたかどうかのフラグのみが返されますが、Slackのリアクション機能のように「誰がリアクションしたか」のユーザー一覧を表示する機能が必要です。

### Current State
- 3つの独立したテーブル: `likes`, `interested`, `want_to_try`
- 既存のAPI: `POST /nodes/:id/like`, `POST /nodes/:id/interested`, `POST /nodes/:id/want-to-try`
- 現在のレスポンスには `count` と `is_reacted` のみ含まれる

### Requirements
1. 各リアクションに対してユーザー一覧を取得できること
2. 初期表示: 20-50ユーザー
3. 無限スクロール対応（カーソルベースのページネーション）
4. モバイル・Web両方で最適なUX

## Decision Drivers
- **ネットワーク効率**: リクエスト数を最小限にする
- **レンダリングパフォーマンス**: 初期表示を高速化
- **ユーザー体験**: モバイル/Webでスムーズなインタラクション
- **メンテナンス性**: シンプルで拡張しやすい設計
- **データ整合性**: リアクション数とユーザーリストの同期

## Options Considered

### Option A: Individual Endpoints (Per-Reaction Type)

```
GET /nodes/:id/reactions/like?limit=30&cursor=xxx
GET /nodes/:id/reactions/interested?limit=30&cursor=xxx
GET /nodes/:id/reactions/want-to-try?limit=30&cursor=xxx
```

**Response Format:**
```typescript
{
  data: [
    {
      user_id: string
      user_name: string
      user_picture: string | null
      reacted_at: string
    }
  ],
  next_cursor: string | null,
  has_more: boolean,
  total: number
}
```

**Pros:**
- シンプルで明確なAPIエンドポイント
- 1つのリアクションタイプのみ展開する場合のネットワーク効率が良い
- キャッシュ戦略が単純（リアクションタイプごとにキャッシュ可能）
- 実装が直感的（既存のtoggleエンドポイントと対称的）

**Cons:**
- 複数のリアクションを同時表示する場合、複数リクエストが必要
- 初期表示で全リアクションタイプを見せる場合、3リクエスト必要

**Use Cases:**
- ユーザーが1つのリアクションタイプをタップして展開
- モーダルで特定のリアクションタイプのみ表示
- "いいね 15人" → タップ → likeユーザーのみ表示

---

### Option B: Unified Endpoint (All Reactions)

```
GET /nodes/:id/reactions?types=like,interested,want_to_try&limit=30&cursor=xxx
```

**Response Format:**
```typescript
{
  reactions: {
    like: {
      data: UserReactionInfo[],
      next_cursor: string | null,
      has_more: boolean,
      total: number
    },
    interested: {
      data: UserReactionInfo[],
      next_cursor: string | null,
      has_more: boolean,
      total: number
    },
    want_to_try: {
      data: UserReactionInfo[],
      next_cursor: string | null,
      has_more: boolean,
      total: number
    }
  }
}

type UserReactionInfo = {
  user_id: string
  user_name: string
  user_picture: string | null
  reacted_at: string
}
```

**Pros:**
- 1リクエストで全リアクションタイプのユーザーリストを取得可能
- 初期表示のネットワーク効率が高い
- クライアント側で複数リクエストを管理する必要がない
- バッチ処理によるDBクエリ効率化の余地

**Cons:**
- オーバーフェッチの可能性（1つしか見ない場合も全取得）
- レスポンスサイズが大きくなる可能性
- ページネーションが複雑（各リアクションタイプごとに独立したカーソル管理）
- キャッシュ戦略が複雑

**Use Cases:**
- Slackのようなリアクション一覧モーダルで全タイプ表示
- 投稿詳細画面でリアクションサマリー + 各タイプの上位ユーザー表示

---

## Decision

**採用: Option A (Individual Endpoints)**

理由は以下の通り:

### 1. UX Analysis: Mobile vs Web

**Mobile:**
- 画面が小さいため、通常は1つのリアクションタイプを展開して表示
- ボトムシートやモーダルで「いいね 15人」をタップ → likeユーザーのみ表示
- スクロールによる追加ロードはモバイルで自然な操作
- **Verdict**: Individual Endpointが最適（オンデマンドロード）

**Web:**
- 大きい画面で複数リアクションを同時表示可能
- しかし、実際のUXでは「展開前は総数のみ、展開後は特定タイプ」が一般的
- Slackでも各リアクションをクリックすると個別のポップアップで表示
- **Verdict**: Individual Endpointで十分（同時展開は稀）

### 2. Network Performance

**Initial Load:**
- リアクション総数は既存のnodeレスポンスに含まれている（追加リクエスト不要）
- ユーザーが特定のリアクションを展開して初めてリストを取得
- ほとんどのケースで0-1リクエストで済む（多くのユーザーは展開しない）

**Incremental Loading:**
- 無限スクロールは1つのリアクションタイプ内で発生
- カーソルベースのページネーションがシンプルに実装可能

### 3. Caching Strategy

Individual Endpointの場合:
```typescript
// Cache key example
cache.set(`node:${nodeId}:reaction:like:page:${cursor}`, data)
```
- リアクションタイプごとに独立してキャッシュ可能
- 新しいリアクションが追加されても該当タイプのキャッシュのみ無効化
- TTLの設定が単純

### 4. Implementation Complexity

**Backend:**
```typescript
// Option A: Simple, single query
const users = await db
  .selectFrom('likes')
  .where('node_id', '=', nodeId)
  .where('created_at', '<', cursor)
  .orderBy('created_at', 'desc')
  .limit(limit + 1)
  .execute();
```

**Frontend:**
```typescript
// Option A: Standard infinite scroll pattern
const { data, fetchNextPage } = useInfiniteQuery({
  queryKey: ['reactions', nodeId, 'like'],
  queryFn: ({ pageParam }) =>
    api.getReactionUsers(nodeId, 'like', pageParam),
  getNextPageParam: (lastPage) => lastPage.next_cursor
});
```

### 5. Scalability

- 各リアクションタイプは独立してスケール可能
- 将来的に新しいリアクションタイプを追加する場合も既存のパターンを踏襲
- レート制限やキャッシュ戦略もリアクションタイプごとに調整可能

## Consequences

### Positive
- **シンプルな実装**: 既存のAPIパターンと一貫性がある
- **効率的なデータロード**: 必要なデータのみ取得
- **キャッシュ最適化**: リアクションタイプごとに独立したキャッシュ
- **拡張性**: 新しいリアクションタイプの追加が容易
- **モバイルUXに最適**: オンデマンドロードでネットワーク効率が高い

### Negative
- **複数同時展開のケース**: 3つ全て展開する場合は3リクエスト必要
  - ただし、実際のUXではこのケースは稀（SlackやX/Twitterでも個別展開）
- **クライアント側の管理**: 複数のリアクションタイプの状態を個別に管理

### Neutral
- **将来的な最適化の余地**:
  - 必要に応じてbatch endpointを追加可能
  - GraphQLへの移行も視野に入れられる
  - 現時点では過剰最適化を避ける

## Implementation Details

### Endpoint Specification

```
GET /nodes/:id/reactions/like?limit=30&cursor=2024-01-15T10:30:00Z
GET /nodes/:id/reactions/interested?limit=30&cursor=2024-01-15T10:30:00Z
GET /nodes/:id/reactions/want-to-try?limit=30&cursor=2024-01-15T10:30:00Z
```

### Parameters
- `limit`: 取得件数（default: 30, min: 10, max: 100）
- `cursor`: カーソル（created_atのISO8601文字列、初回リクエストでは省略）

### Response Schema
```typescript
{
  data: [
    {
      user_id: string          // ユーザーID
      user_name: string        // 表示名
      user_picture: string | null  // プロフィール画像URL
      reacted_at: string       // リアクションした日時（ISO8601）
    }
  ],
  next_cursor: string | null,  // 次ページのカーソル（最後のページではnull）
  has_more: boolean,           // さらにデータがあるか
  total: number                // 総リアクション数
}
```

### Cursor-based Pagination Strategy
- カーソルは `created_at` タイムスタンプを使用
- `ORDER BY created_at DESC` で最新のリアクションから取得
- `limit + 1` で取得し、has_moreを判定
- ISO8601フォーマットで返却（URLエンコード不要）

### Default Limit Recommendation
**推奨: limit=30**

根拠:
- モバイル: 1画面に5-10人表示 → 3-6スクロール分
- Web: 1画面に10-15人表示 → 2-3スクロール分
- ネットワーク: ~5-10KB/リクエスト（適切なサイズ）
- UX: スクロールによる追加ロードが自然

20-50の範囲内で30が最適なバランス点。

## Alternatives Considered

### Option C: GraphQL
- Pros: クライアントが必要なフィールドのみ指定可能
- Cons: 現在のREST APIとの整合性、学習コスト、実装コスト
- **判断**: 現時点では過剰。将来的に検討可能。

### Option D: Hybrid Approach
```
GET /nodes/:id/reactions?type=like  // single
GET /nodes/:id/reactions?types=like,interested  // multiple
```
- Pros: 両方のユースケースに対応
- Cons: API設計が複雑、クライアント側の実装分岐
- **判断**: YAGNI（You Aren't Gonna Need It）原則により却下

## Related Issues
- Issue #44: 投稿に対するいいね・きになる・やってみたい 一覧を表示する機能

## References
- Slack Reactions UX: https://slack.com/help/articles/206870317-Use-emoji-reactions
- Cursor-based Pagination: https://jsonapi.org/profiles/ethanresnick/cursor-pagination/
- REST API Best Practices: https://restfulapi.net/
