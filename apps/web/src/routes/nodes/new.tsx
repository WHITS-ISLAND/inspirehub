import { useState } from "react";
import { createRoute, useNavigate, type AnyRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { InferResponseType } from "hono/client";
import { Loader2 } from "lucide-react";
import { api, handleResponse } from "@/lib/api";

type NodeDetail = InferResponseType<(typeof api.nodes)[":id"]["$get"], 200>;
type NodeCreateResponse = InferResponseType<(typeof api.nodes)["$post"], 201>;
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { TagInput } from "@/components/nodes/TagInput";

export type NodeType = "issue" | "idea";

export interface SearchParams {
  type?: NodeType;
  parent_id?: string;
}

function NodeCreateContent({ searchParams }: { searchParams: SearchParams }) {
  const navigate = useNavigate();
  const isDerived = !!searchParams.parent_id;
  const [nodeType, setNodeType] = useState<NodeType>(
    isDerived ? "idea" : (searchParams.type ?? "issue"),
  );
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState<string[]>([]);

  const parentQuery = useQuery({
    queryKey: ["nodes", searchParams.parent_id],
    queryFn: async () => {
      if (!searchParams.parent_id) return null;
      const res = await api.nodes[":id"].$get({ param: { id: searchParams.parent_id } });
      return handleResponse<NodeDetail>(res);
    },
    enabled: !!searchParams.parent_id,
  });

  const createNode = useMutation({
    mutationFn: async () => {
      const fetcher = () =>
        api.nodes.$post({
          json: {
            type: nodeType,
            title,
            content,
            tags: tags.length > 0 ? tags : undefined,
            parent_node_id: searchParams.parent_id,
          },
        });
      const res = await fetcher();
      return handleResponse<NodeCreateResponse>(res, fetcher);
    },
    onSuccess: () => {
      void navigate({ to: "/" });
    },
  });

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">{isDerived ? "派生アイデアを投稿" : "ノードを作成"}</h1>

      {parentQuery.data && (
        <div className="mt-3 rounded-lg border border-border bg-secondary/50 p-3">
          <p className="text-sm font-medium">{parentQuery.data.title}</p>
          {parentQuery.data.content && (
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
              {parentQuery.data.content}
            </p>
          )}
        </div>
      )}

      <div className="mt-4 space-y-4">
        {!isDerived && (
          <div className="flex gap-2">
            {(["issue", "idea"] as const).map((t) => {
              const active = nodeType === t;
              const color =
                t === "issue"
                  ? active
                    ? "border-red-400 bg-red-100 text-red-800 dark:border-red-600 dark:bg-red-900/30 dark:text-red-300"
                    : "border-border text-muted-foreground hover:border-red-300"
                  : active
                    ? "border-blue-400 bg-blue-100 text-blue-800 dark:border-blue-600 dark:bg-blue-900/30 dark:text-blue-300"
                    : "border-border text-muted-foreground hover:border-blue-300";
              return (
                <button
                  key={t}
                  onClick={() => setNodeType(t)}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium ${color}`}
                >
                  {t === "issue" ? "課題" : "アイデア"}
                </button>
              );
            })}
          </div>
        )}

        <div>
          <Label htmlFor="title">タイトル</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="タイトル…"
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="content">内容</Label>
          <Textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="内容…"
            rows={6}
            className="mt-1"
          />
        </div>

        <div>
          <Label>タグ</Label>
          <div className="mt-1">
            <TagInput tags={tags} onTagsChange={setTags} />
          </div>
        </div>

        <Button
          onClick={() => createNode.mutate()}
          disabled={createNode.isPending || !title.trim()}
          className="w-full"
        >
          {createNode.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          投稿
        </Button>

        {createNode.error && <p className="text-sm text-destructive">投稿に失敗しました。</p>}
      </div>
    </div>
  );
}

function NodeCreatePage() {
  const search = nodeCreateRoute.useSearch() as SearchParams;
  return <NodeCreateContent searchParams={search} />;
}

// biome-ignore lint: module-level route ref for useSearch
let nodeCreateRoute: any;

export default (parentRoute: AnyRoute) => {
  nodeCreateRoute = createRoute({
    getParentRoute: () => parentRoute,
    path: "/nodes/new",
    component: NodeCreatePage,
    validateSearch: (search: Record<string, unknown>): SearchParams => ({
      type: search.type as NodeType | undefined,
      parent_id: search.parent_id as string | undefined,
    }),
  });
  return nodeCreateRoute;
};
